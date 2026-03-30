import request from 'supertest';
import { createApp } from '../app';
import { Mother } from '../models/Mother';
import { Child } from '../models/Child';
import { User } from '../models/User';
import { Appointment } from '../models/Appointment';
import jwt from 'jsonwebtoken';
import { jwtSecret } from '../config/env';

const app = createApp();

describe('Children Controller', () => {
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

  describe('POST /api/children/register', () => {
    it('should register a child and generate vaccination schedule', async () => {
      const res = await request(app)
        .post('/api/children/register')
        .set('Authorization', `Bearer ${token}`)
        .send({
          motherId,
          name: 'Baby Jane',
          dateOfBirth: new Date().toISOString(),
          sex: 'female',
        });

      expect(res.status).toBe(201);
      expect(res.body.child.name).toBe('Baby Jane');
      expect(res.body.appointmentsCount).toBeGreaterThan(0);

      const appointments = await Appointment.find({ child: res.body.child._id });
      expect(appointments.length).toBe(res.body.appointmentsCount);
    });
  });

  describe('GET /api/children/mother/:motherId', () => {
    it('should list all children for a mother', async () => {
      await Child.create({
        mother: motherId,
        name: 'Child 1',
        dateOfBirth: new Date(),
      });

      const res = await request(app)
        .get(`/api/children/mother/${motherId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
    });
  });
});
