import request from 'supertest';
import { createApp } from '../app';
import { User } from '../models/User';
import jwt from 'jsonwebtoken';
import { jwtSecret } from '../config/env';
import * as groqUtils from '../utils/groq';

const app = createApp();

describe('AI Controller', () => {
  let token: string;

  beforeEach(async () => {
    const user = await User.create({
      name: 'Dr. AI',
      email: 'ai@example.com',
      password: 'password123',
      role: 'doctor',
    });
    token = jwt.sign({ id: user._id, role: 'doctor', tokenType: 'doctor' }, jwtSecret);

    jest.spyOn(groqUtils, 'getGroqClient').mockReturnValue({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{ message: { content: 'Stay hydrated and rest well.' } }],
            usage: { prompt_tokens: 10, completion_tokens: 8, total_tokens: 18 },
          }),
        },
      },
    } as any);
  });

  describe('POST /api/ai/chat', () => {
    it('should return an AI reply', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'What should I eat during pregnancy?' });

      expect(res.status).toBe(200);
      expect(res.body.reply).toBe('Stay hydrated and rest well.');
      expect(res.body.model).toBeDefined();
    });

    it('should reject unauthenticated requests', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .send({ message: 'Hello' });

      expect(res.status).toBe(401);
    });

    it('should reject empty message', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: '' });

      expect(res.status).toBe(400);
    });
  });
});
