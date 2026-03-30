import request from 'supertest';
import { createApp } from '../app';
import { Mother } from '../models/Mother';
import { Appointment } from '../models/Appointment';
import { FollowUp } from '../models/FollowUp';
import { User } from '../models/User';
import jwt from 'jsonwebtoken';
import { jwtSecret } from '../config/env';

const app = createApp();

describe('Dashboard Controller', () => {
  let token: string;

  beforeEach(async () => {
    const doctor = await User.create({
      name: 'Dr. Test',
      email: 'dr@example.com',
      password: 'password123',
      role: 'doctor',
    });
    token = jwt.sign({ id: doctor._id, role: 'doctor', tokenType: 'doctor' }, jwtSecret);
  });

  describe('GET /api/dashboard/summary', () => {
    it('should return correct high-level statistics', async () => {
      // Setup some data
      const mother = await Mother.create({ firstName: 'M1', lastName: 'L1', phone: '1', status: 'active' });
      await Appointment.create({ mother: mother._id, type: 'ANC', scheduledFor: new Date(), status: 'missed' });
      await Mother.findByIdAndUpdate(mother._id, { missedAppointmentsCount: 1 });
      await FollowUp.create({ mother: mother._id, reason: 'Missed appointment', status: 'open' });

      const res = await request(app)
        .get('/api/dashboard/summary')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.activeMothers).toBe(1);
      expect(res.body.missedAppointments).toBe(1);
      expect(res.body.openFollowUps).toBe(1);
    });
  });
});
