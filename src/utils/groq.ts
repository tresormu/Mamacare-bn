import Groq from 'groq-sdk';
import { IMother } from '../models/Mother';
import { IChild } from '../models/Child';

let _client: Groq | null = null;

export function getGroqClient(): Groq {
  if (!_client) {
    _client = new Groq({ apiKey: process.env.MAMACARE_AI_KEY });
  }
  return _client;
}

export function buildSystemPrompt(mother?: IMother | null, children?: IChild[]): string {
  const base = `You are MamaCare+ AI, a compassionate maternal and child health assistant for healthcare workers in Rwanda.
You help doctors, nurses, and community health workers (CHWs) with:
- Pregnancy guidance (ANC visits, nutrition, danger signs)
- Postpartum care and breastfeeding support
- Child vaccination schedules and growth milestones
- Interpreting risk flags and missed appointment patterns
- General maternal and child health questions

Rules:
- Always be concise, warm, and professional
- If a question is outside maternal/child health, politely decline and redirect
- Never diagnose — always recommend consulting a qualified clinician for clinical decisions
- Respond in the same language the user writes in (English, French, or Kinyarwanda)`;

  if (!mother) return base;

  const now = new Date();
  const childrenInfo = (children ?? []).map((c) => {
    const ageMs = now.getTime() - new Date(c.dateOfBirth).getTime();
    const ageMonths = Math.floor(ageMs / (1000 * 60 * 60 * 24 * 30.4375));
    return `  - ${c.name || 'Unnamed'} (${c.sex ?? 'unknown sex'}), ${ageMonths} months old`;
  }).join('\n');

  const context = `
Current patient context:
- Name: ${mother.firstName} ${mother.lastName}
- Pregnancy weeks: ${mother.pregnancyWeeks ?? 'N/A'}
- Parity: ${mother.parity ?? 'N/A'}
- Risk flags: ${mother.riskFlags.length > 0 ? mother.riskFlags.join(', ') : 'none'}
- Missed appointments: ${mother.missedAppointmentsCount}
- Status: ${mother.status}
- Preferred language: ${mother.preferredLanguage}
${childrenInfo ? `- Children:\n${childrenInfo}` : '- Children: none registered'}

Use this context to give personalised, relevant guidance.`;

  return base + context;
}
