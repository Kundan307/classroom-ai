import * as faceapi from '@vladmandic/face-api';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import type { BehaviorType, StudentDetection } from '@shared/schema';

const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';

let modelsLoaded = false;
let loadingPromise: Promise<void> | null = null;
let personDetector: cocoSsd.ObjectDetection | null = null;

export async function loadModels(): Promise<void> {
  if (modelsLoaded) return;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const tf = faceapi.tf as any;
    if (tf && tf.setBackend) {
      try {
        await tf.setBackend('webgl');
        await tf.ready();
      } catch {
        try {
          await tf.setBackend('cpu');
          await tf.ready();
        } catch {
        }
      }
    }

    const [, , , , detector] = await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
      faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL),
      cocoSsd.load({ base: 'lite_mobilenet_v2' }),
    ]);

    personDetector = detector;
    modelsLoaded = true;
  })();

  return loadingPromise;
}

export function isModelsLoaded(): boolean {
  return modelsLoaded;
}

export async function detectFaces(video: HTMLVideoElement) {
  if (!modelsLoaded) return [];
  try {
    return await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({
        inputSize: 416,
        scoreThreshold: 0.5,
      }))
      .withFaceLandmarks()
      .withFaceExpressions()
      .withAgeAndGender();
  } catch {
    return [];
  }
}

export async function detectPersons(video: HTMLVideoElement): Promise<cocoSsd.DetectedObject[]> {
  if (!personDetector) return [];
  try {
    const predictions = await personDetector.detect(video, 20);
    return predictions.filter((p) => p.class === 'person' && p.score > 0.35);
  } catch {
    return [];
  }
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function eyeAspectRatio(eyePoints: { x: number; y: number }[]): number {
  if (eyePoints.length < 6) return 0.3;
  const v1 = dist(eyePoints[1], eyePoints[5]);
  const v2 = dist(eyePoints[2], eyePoints[4]);
  const h = dist(eyePoints[0], eyePoints[3]);
  if (h === 0) return 0.3;
  return (v1 + v2) / (2 * h);
}

export function classifyBehavior(
  expressions: Record<string, number>,
  landmarks: faceapi.FaceLandmarks68
): { behavior: BehaviorType; confidence: number } {
  const leftEye = landmarks.getLeftEye();
  const rightEye = landmarks.getRightEye();
  const leftEAR = eyeAspectRatio(leftEye);
  const rightEAR = eyeAspectRatio(rightEye);
  const avgEAR = (leftEAR + rightEAR) / 2;

  const neutral = expressions.neutral || 0;
  const happy = expressions.happy || 0;
  const sad = expressions.sad || 0;
  const angry = expressions.angry || 0;
  const fearful = expressions.fearful || 0;
  const disgusted = expressions.disgusted || 0;
  const surprised = expressions.surprised || 0;

  if (avgEAR < 0.19) return { behavior: 'Drowsy', confidence: Math.min(0.95, 1 - avgEAR * 3) };
  if (happy > 0.6 || surprised > 0.5) return { behavior: 'Engaged', confidence: Math.max(happy, surprised) };
  if (neutral > 0.5 && avgEAR > 0.22) return { behavior: 'Attentive', confidence: neutral };
  if (fearful > 0.25 || (surprised > 0.3 && neutral < 0.3)) return { behavior: 'Confused', confidence: Math.max(fearful, surprised * 0.7) };
  if (sad > 0.25 || angry > 0.25 || disgusted > 0.2) return { behavior: 'Distracted', confidence: Math.max(sad, angry, disgusted) };
  return { behavior: 'Attentive', confidence: Math.max(0.4, neutral) };
}

function boxOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  if (x2 <= x1 || y2 <= y1) return 0;
  const inter = (x2 - x1) * (y2 - y1);
  const areaA = a.width * a.height;
  const areaB = b.width * b.height;
  const smaller = Math.min(areaA, areaB);
  return smaller > 0 ? inter / smaller : 0;
}

function isFaceInsidePerson(
  face: { x: number; y: number; width: number; height: number },
  person: { x: number; y: number; width: number; height: number }
): boolean {
  const faceCx = face.x + face.width / 2;
  const faceCy = face.y + face.height / 2;
  return (
    faceCx >= person.x &&
    faceCx <= person.x + person.width &&
    faceCy >= person.y &&
    faceCy <= person.y + person.height
  );
}

export function mergeDetections(
  faceDetections: Awaited<ReturnType<typeof detectFaces>>,
  personDetections: cocoSsd.DetectedObject[]
): StudentDetection[] {
  const results: StudentDetection[] = [];
  const matchedPersons = new Set<number>();
  let nextId = 0;

  for (const fd of faceDetections) {
    const faceBox = {
      x: fd.detection.box.x,
      y: fd.detection.box.y,
      width: fd.detection.box.width,
      height: fd.detection.box.height,
    };

    const { behavior, confidence } = classifyBehavior(
      fd.expressions as unknown as Record<string, number>,
      fd.landmarks
    );

    let bestPersonIdx = -1;
    let bestOverlap = 0;

    for (let pi = 0; pi < personDetections.length; pi++) {
      if (matchedPersons.has(pi)) continue;
      const pd = personDetections[pi];
      const personBox = { x: pd.bbox[0], y: pd.bbox[1], width: pd.bbox[2], height: pd.bbox[3] };

      if (isFaceInsidePerson(faceBox, personBox)) {
        const overlap = boxOverlap(faceBox, personBox);
        if (overlap > bestOverlap || bestPersonIdx === -1) {
          bestOverlap = overlap;
          bestPersonIdx = pi;
        }
      }
    }

    if (bestPersonIdx >= 0) {
      matchedPersons.add(bestPersonIdx);
    }

    results.push({
      id: nextId++,
      box: faceBox,
      behavior,
      confidence,
      age: Math.round(fd.age),
      gender: fd.gender,
      expressions: fd.expressions as unknown as Record<string, number>,
    });
  }

  for (let pi = 0; pi < personDetections.length; pi++) {
    if (matchedPersons.has(pi)) continue;
    const pd = personDetections[pi];
    results.push({
      id: nextId++,
      box: { x: pd.bbox[0], y: pd.bbox[1], width: pd.bbox[2], height: pd.bbox[3] },
      behavior: 'Present',
      confidence: pd.score,
      age: 0,
      gender: '',
      expressions: {},
    });
  }

  return results;
}

export function computeAttentionScore(students: StudentDetection[]): number {
  const withFace = students.filter((s) => s.behavior !== 'Present');
  if (withFace.length === 0) return 0;
  const positiveCount = withFace.filter(
    (s) => s.behavior === 'Attentive' || s.behavior === 'Engaged'
  ).length;
  return Math.round((positiveCount / withFace.length) * 100);
}

export function computeBehaviorDistribution(students: StudentDetection[]): Record<string, number> {
  const d: Record<string, number> = {
    Attentive: 0, Engaged: 0, Confused: 0, Distracted: 0, Drowsy: 0, Present: 0,
  };
  students.forEach((s) => { d[s.behavior] = (d[s.behavior] || 0) + 1; });
  return d;
}

export function getBehaviorColor(behavior: BehaviorType): string {
  const colors: Record<BehaviorType, string> = {
    Attentive: '#facc15',
    Engaged: '#22d3ee',
    Confused: '#f97316',
    Distracted: '#f43f5e',
    Drowsy: '#ef4444',
    Present: '#a78bfa',
  };
  return colors[behavior];
}

export function drawDetections(
  ctx: CanvasRenderingContext2D,
  students: StudentDetection[],
  scaleX: number,
  scaleY: number,
  mirrored: boolean = true
) {
  const cw = ctx.canvas.width;
  ctx.clearRect(0, 0, cw, ctx.canvas.height);

  students.forEach((student) => {
    let x = student.box.x * scaleX;
    const y = student.box.y * scaleY;
    const w = student.box.width * scaleX;
    const h = student.box.height * scaleY;

    if (mirrored) {
      x = cw - x - w;
    }

    const color = getBehaviorColor(student.behavior);
    const isBodyOnly = student.behavior === 'Present';
    const cornerLen = Math.min(28, w * 0.15, h * 0.15);
    const lineWidth = isBodyOnly ? 2.5 : 3.5;

    ctx.save();

    ctx.shadowColor = color;
    ctx.shadowBlur = isBodyOnly ? 14 : 22;
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'square';

    if (isBodyOnly) {
      ctx.setLineDash([8, 6]);
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);
    } else {
      ctx.beginPath();
      ctx.moveTo(x, y + cornerLen);
      ctx.lineTo(x, y);
      ctx.lineTo(x + cornerLen, y);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x + w - cornerLen, y);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x + w, y + cornerLen);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x + w, y + h - cornerLen);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x + w - cornerLen, y + h);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x + cornerLen, y + h);
      ctx.lineTo(x, y + h);
      ctx.lineTo(x, y + h - cornerLen);
      ctx.stroke();

      ctx.shadowBlur = 6;
      ctx.strokeStyle = `${color}30`;
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, w, h);
    }

    ctx.fillStyle = `${color}08`;
    ctx.fillRect(x, y, w, h);
    ctx.shadowBlur = 0;

    const label = isBodyOnly ? 'Person' : student.behavior;
    const conf = `${Math.round(student.confidence * 100)}%`;
    const fontSize = Math.max(12, Math.min(16, w * 0.07));
    ctx.font = `700 ${fontSize}px "Space Grotesk", sans-serif`;

    const labelWidth = ctx.measureText(label).width;
    ctx.font = `500 ${fontSize - 1}px "Space Grotesk", sans-serif`;
    const confWidth = ctx.measureText(conf).width;
    const totalWidth = labelWidth + confWidth + 20;
    const labelHeight = fontSize + 12;
    const labelX = x;
    const labelY = y - labelHeight - 6;

    ctx.fillStyle = `${color}44`;
    ctx.strokeStyle = `${color}88`;
    ctx.lineWidth = 1.5;
    const radius = 5;
    ctx.beginPath();
    ctx.moveTo(labelX + radius, labelY);
    ctx.lineTo(labelX + totalWidth - radius, labelY);
    ctx.arcTo(labelX + totalWidth, labelY, labelX + totalWidth, labelY + radius, radius);
    ctx.lineTo(labelX + totalWidth, labelY + labelHeight - radius);
    ctx.arcTo(labelX + totalWidth, labelY + labelHeight, labelX + totalWidth - radius, labelY + labelHeight, radius);
    ctx.lineTo(labelX + radius, labelY + labelHeight);
    ctx.arcTo(labelX, labelY + labelHeight, labelX, labelY + labelHeight - radius, radius);
    ctx.lineTo(labelX, labelY + radius);
    ctx.arcTo(labelX, labelY, labelX + radius, labelY, radius);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = `700 ${fontSize}px "Space Grotesk", sans-serif`;
    ctx.fillText(label, labelX + 8, labelY + labelHeight - 7);

    ctx.fillStyle = color;
    ctx.font = `500 ${fontSize - 1}px "Space Grotesk", sans-serif`;
    ctx.fillText(conf, labelX + labelWidth + 14, labelY + labelHeight - 7);

    ctx.restore();
  });
}