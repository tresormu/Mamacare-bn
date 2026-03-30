import request from 'supertest';
import { createApp } from '../app';
import { User } from '../models/User';
import { Mother } from '../models/Mother';
import jwt from 'jsonwebtoken';
import { jwtSecret } from '../config/env';

const app = createApp();

describe('Admin Controller', () => {
  let adminToken: string;
  let doctorId: string;

  beforeEach(async () => {
    const admin = await User.create({
      name: 'System Admin',
      email: 'admin@example.com',
      password: 'password123',
      role: 'admin',
    });
    adminToken = jwt.sign({ id: admin._id, role: 'admin', tokenType: 'admin' }, jwtSecret);

    const doctor = await User.create({
      name: 'Doctor To Manage',
      email: 'doctor@example.com',
      password: 'password123',
      role: 'doctor',
    });
    doctorId = doctor._id.toString();
  });

  describe('GET /api/admin/users', () => {
    it('should list all Doctors and CHWs', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some((u: any) => u.email === 'doctor@example.com')).toBe(true);
    });
  });

  describe('PUT /api/admin/users/:id', () => {
    it('should update a staff member name', async () => {
      const res = await request(app)
        .put(`/api/admin/users/${doctorId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Doctor Name' });

      expect(res.status).toBe(200);
      expect(res.body.user.name).toBe('Updated Doctor Name');
    });
  });

  describe('DELETE /api/admin/users/:id', () => {
    it('should delete a staff member', async () => {
      const res = await request(app)
        .delete(`/api/admin/users/${doctorId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const user = await User.findById(doctorId);
      expect(user).toBeNull();
    });
  });

  describe('GET /api/admin/summary', () => {
    it('should return system-wide summary', async () => {
      await Mother.create({ firstName: 'M1', lastName: 'L1', phone: '1', status: 'active' });
      
      const res = await request(app)
        .get('/api/admin/summary')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.summary.totalActiveMothers).toBe(1);
      expect(res.body.summary.staff.doctors).toBe(1);
    });
  });
});
