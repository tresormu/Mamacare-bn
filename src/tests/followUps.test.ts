import request from 'supertest';
import { createApp } from '../app';
import { Mother } from '../models/Mother';
import { FollowUp } from '../models/FollowUp';
import { User } from '../models/User';
import jwt from 'jsonwebtoken';
import { jwtSecret } from '../config/env';

const app = createApp();

describe('FollowUps Controller', () => {
  let chwToken: string;
  let motherId: string;

  beforeEach(async () => {
    const chw = await User.create({
      name: 'CHW Agent',
      email: 'chw@example.com',
      password: 'password123',
      role: 'chw',
    });
    chwToken = jwt.sign({ id: chw._id, role: 'chw', tokenType: 'chw' }, jwtSecret);

    const mother = await Mother.create({
      firstName: 'Jane',
      lastName: 'Doe',
      phone: '0780000000',
      missedAppointmentsCount: 4,
    });
    motherId = mother._id.toString();
  });

  describe('GET /api/follow-ups', () => {
    it('should list open follow-ups', async () => {
      await FollowUp.create({
        mother: motherId,
        reason: 'Missed 4 appointments',
        status: 'open',
      });

      const res = await request(app)
        .get('/api/follow-ups')
        .set('Authorization', `Bearer ${chwToken}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].reason).toMatch(/Missed 4 appointments/i);
    });
  });

  describe('POST /api/follow-ups/:id/resolve', () => {
    it('should resolve follow-up and reset mother count', async () => {
      const followup = await FollowUp.create({
        mother: motherId,
        reason: 'Missed 4 appointments',
        status: 'open',
      });

      const res = await request(app)
        .post(`/api/follow-ups/${followup._id}/resolve`)
        .set('Authorization', `Bearer ${chwToken}`)
        .send({ notes: 'Mother visited. She was traveling.' });

      expect(res.status).toBe(200);
      expect(res.body.followUp.status).toBe('closed');
      expect(res.body.followUp.resolvedBy).toBe('CHW Agent');

      const mother = await Mother.findById(motherId);
      expect(mother?.missedAppointmentsCount).toBe(0);
    });
  });
});
