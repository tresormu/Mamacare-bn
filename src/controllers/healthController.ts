import { Request, Response, NextFunction } from 'express';

type RiskLevel = 'NORMAL' | 'MONITOR' | 'EMERGENCY';

interface SymptomAssessment {
  riskLevel: RiskLevel;
  guidance: string;
  isEmergency: boolean;
}

// Danger signs based on WHO maternal/child health standards
const MOTHER_DANGER_SIGNS = new Set([
  'severe_headache', 'severe headache',
  'vision_blurring', 'blurred vision',
  'vaginal_bleeding', 'vaginal bleeding',
  'convulsions',
  'high_fever', 'high fever',
  'severe_abdominal_pain', 'severe abdominal pain',
  'difficulty_breathing', 'difficulty breathing',
  'no_fetal_movement', 'no fetal movement',
  'swollen_face', 'swollen face/hands',
  'persistent_vomiting', 'persistent vomiting',
]);

const INFANT_DANGER_SIGNS = new Set([
  'convulsions',
  'difficulty_breathing', 'difficulty breathing',
  'high_fever', 'high fever',
  'unconscious',
  'severe_dehydration', 'severe dehydration',
]);

const MOTHER_MONITOR_SIGNS = new Set([
  'mild_swelling', 'mild swelling',
  'reduced_baby_movement', 'reduced baby movement',
  'mild_abdominal_discomfort', 'mild abdominal discomfort',
  'slight_fever', 'slight fever',
  'back_pain', 'back pain',
]);

const INFANT_MONITOR_SIGNS = new Set([
  'poor_feeding', 'poor feeding',
  'mild_fever', 'mild fever',
  'diarrhea',
  'vomiting',
  'irritability',
]);

// For the danger-signs endpoint
const DANGER_SIGNS = [...MOTHER_DANGER_SIGNS];
const MONITOR_SIGNS = [...MOTHER_MONITOR_SIGNS];

export async function assessSymptoms(req: Request, res: Response, next: NextFunction) {
  try {
    const { symptoms, patientType } = req.body as {
      symptoms: string[];
      patientType?: 'mother' | 'infant';
    };

    if (!symptoms || !Array.isArray(symptoms)) {
      return res.status(400).json({ error: 'Symptoms must be provided as an array of strings' });
    }

    const normalizedSymptoms = symptoms.map(s => s.toLowerCase());
    const isInfant = patientType === 'infant';
    const dangerSet = isInfant ? INFANT_DANGER_SIGNS : MOTHER_DANGER_SIGNS;
    const monitorSet = isInfant ? INFANT_MONITOR_SIGNS : MOTHER_MONITOR_SIGNS;

    let riskLevel: RiskLevel = 'NORMAL';
    let guidance = 'These symptoms are common during pregnancy. Continue with your scheduled appointments and stay hydrated.';
    let isEmergency = false;

    // Triage Logic
    const hasEmergency = normalizedSymptoms.some(s => dangerSet.has(s));
    const hasMonitor = normalizedSymptoms.some(s => monitorSet.has(s));

    if (hasEmergency) {
      riskLevel = 'EMERGENCY';
      guidance = 'URGENT: These are danger signs. Please go to the nearest hospital immediately.';
      isEmergency = true;
    } else if (hasMonitor) {
      riskLevel = 'MONITOR';
      guidance = 'PLEASE MONITOR: These symptoms require closer attention. Contact your healthcare provider or CHW if they persist or worsen.';
    }

    const assessment: SymptomAssessment = {
      riskLevel,
      guidance,
      isEmergency,
    };

    res.status(200).json(assessment);
  } catch (err) {
    next(err);
  }
}

export function getDangerSigns(_req: Request, res: Response) {
  res.status(200).json({ dangerSigns: DANGER_SIGNS, monitorSigns: MONITOR_SIGNS });
}
