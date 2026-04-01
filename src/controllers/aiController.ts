import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import { ApiError } from '../middleware/error';
import { Mother } from '../models/Mother';
import { Child } from '../models/Child';
import { getGroqClient, buildSystemPrompt } from '../utils/groq';

const MODEL = 'llama-3.3-70b-versatile';
const MAX_TOKENS = 1024;

export async function chat(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new ApiError('Unauthorized', 401);

    const { message, motherId, history = [] } = req.body;

    // Optionally enrich with mother context
    let systemPrompt: string;
    if (motherId) {
      const [mother, children] = await Promise.all([
        Mother.findById(motherId),
        Child.find({ mother: motherId }),
      ]);
      systemPrompt = buildSystemPrompt(mother, children);
    } else {
      systemPrompt = buildSystemPrompt();
    }

    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-10),
      { role: 'user', content: message },
    ];

    const groq = getGroqClient();
    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages,
      max_tokens: MAX_TOKENS,
      temperature: 0.5,
    });

    const reply = completion.choices[0]?.message?.content ?? '';

    res.status(200).json({
      reply,
      model: MODEL,
      usage: completion.usage,
    });
  } catch (err) {
    next(err);
  }
}

export const chatSchema = z.object({
  body: z.object({
    message: z.string().min(1).max(2000),
    motherId: z.string().optional(),
    history: z
      .array(
        z.object({
          role: z.enum(['user', 'assistant']),
          content: z.string(),
        })
      )
      .max(20)
      .optional(),
  }),
});
