import request from 'supertest';
import { createApp } from '../app';
import { Mother } from '../models/Mother';
import { Appointment } from '../models/Appointment';
import { FollowUp } from '../models/FollowUp';
import { User } from '../models/User';
import jwt from 'jsonwebtoken';
import { jwtSecret } from '../config/env';

const app = createApp();

describe('Appointments Controller', () => {
  let token: string;
  let motherId: string;

  beforeEach(async () => {
    const doctor = await User.create({
      name: 'Dr. Test',
      email: 'dr@example.com',
      password: 'password123',
      role: 'doctor',
    });
    token = jwt.sign({ id: doctor._id, role: 'doctor', tokenType: 'doctor' }, jwtSecret);

    const mother = await Mother.create({
      firstName: 'Jane',
      lastName: 'Doe',
      phone: '0780000000',
    });
    motherId = mother._id.toString();
  });

  describe('PATCH /api/appointments/:id/status', () => {
    it('should update status and increment missed count if "missed"', async () => {
      const appointment = await Appointment.create({
        mother: motherId,
        type: 'ANC',
        scheduledFor: new Date(),
        status: 'scheduled',
      });

      const res = await request(app)
        .patch(`/api/appointments/${appointment._id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'missed' });

      expect(res.status).toBe(200);
      expect(res.body.appointment.status).toBe('missed');

      const mother = await Mother.findById(motherId);
      expect(mother?.missedAppointmentsCount).toBe(1);
    });

    it('should trigger a CHW referral when missed count reaches 4', async () => {
      // Setup: 3 missed appointments already
      await Mother.findByIdAndUpdate(motherId, { missedAppointmentsCount: 3 });
      
      const appointment = await Appointment.create({
        mother: motherId,
        type: 'ANC',
        scheduledFor: new Date(),
        status: 'scheduled',
      });

      const res = await request(app)
        .patch(`/api/appointments/${appointment._id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'missed' });

      expect(res.status).toBe(200);
      expect(res.body.followUpTriggered).toBe(true);

      const followUp = await FollowUp.findOne({ mother: motherId });
      expect(followUp).toBeTruthy();
      expect(followUp?.reason).toMatch(/Missed 4 appointments/i);
    });

    it('should NOT trigger referral if status is "completed"', async () => {
      // Setup: 3 missed appointments already
      await Mother.findByIdAndUpdate(motherId, { missedAppointmentsCount: 3 });
      
      const appointment = await Appointment.create({
        mother: motherId,
        type: 'ANC',
        scheduledFor: new Date(),
        status: 'scheduled',
      });

      const res = await request(app)
        .patch(`/api/appointments/${appointment._id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'completed' });

      expect(res.status).toBe(200);
      expect(res.body.followUpTriggered).toBe(false);

      const followUp = await FollowUp.findOne({ mother: motherId });
      expect(followUp).toBeNull();
    });
  });
});
