import request from 'supertest';
import { createApp } from '../app';
import { User } from '../models/User';
import { Mother } from '../models/Mother';
import jwt from 'jsonwebtoken';
import { jwtSecret } from '../config/env';

const app = createApp();

describe('Doctors Controller', () => {
  let doctorToken: string;
  let doctorId: string;
  let otherDoctorToken: string;

  beforeEach(async () => {
    const doctor = await User.create({
      name: 'Dr. One',
      email: 'dr1@example.com',
      password: 'password123',
      role: 'doctor',
    });
    doctorId = doctor._id.toString();
    doctorToken = jwt.sign({ id: doctor._id, role: 'doctor', tokenType: 'doctor' }, jwtSecret);

    const otherDoctor = await User.create({
      name: 'Dr. Two',
      email: 'dr2@example.com',
      password: 'password123',
      role: 'doctor',
    });
    otherDoctorToken = jwt.sign({ id: otherDoctor._id, role: 'doctor', tokenType: 'doctor' }, jwtSecret);
  });

  describe('GET /api/doctors/my-mothers', () => {
    it('should only list mothers assigned to the logged-in doctor', async () => {
      // Mother 1 assigned to Dr. One
      await Mother.create({
        firstName: 'M1',
        lastName: 'L1',
        phone: '1',
        assignedDoctor: doctorId,
      });

      // Mother 2 assigned to Dr. Two
      await Mother.create({
        firstName: 'M2',
        lastName: 'L2',
        phone: '2',
        assignedDoctor: (await User.findOne({ email: 'dr2@example.com' }))?._id,
      });

      const res = await request(app)
        .get('/api/doctors/my-mothers')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].firstName).toBe('M1');
    });
  });

  describe('GET /api/doctors/summary', () => {
    it('should return stats for the doctor\'s own cohort', async () => {
      await Mother.create({
        firstName: 'High Risk',
        lastName: 'Patient',
        phone: '3',
        assignedDoctor: doctorId,
        riskFlags: ['High BP'],
        status: 'active'
      });

      const res = await request(app)
        .get('/api/doctors/summary')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.summary.myTotalPatients).toBe(1);
      expect(res.body.summary.myHighRiskPatients).toBe(1);
    });
  });
});
