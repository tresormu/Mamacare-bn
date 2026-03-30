import request from 'supertest';
import { createApp } from '../app';
import { Mother } from '../models/Mother';
import { User } from '../models/User';
import { Child } from '../models/Child';
import jwt from 'jsonwebtoken';
import { jwtSecret } from '../config/env';

const app = createApp();

describe('Mothers Controller', () => {
  let token: string;
  let adminToken: string;

  beforeEach(async () => {
    const doctor = await User.create({
      name: 'Dr. Test',
      email: 'dr@example.com',
      password: 'password123',
      role: 'doctor',
    });
    token = jwt.sign({ id: doctor._id, role: 'doctor', tokenType: 'doctor' }, jwtSecret);

    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'password123',
      role: 'admin',
    });
    adminToken = jwt.sign({ id: admin._id, role: 'admin', tokenType: 'admin' }, jwtSecret);
  });

  const testMother = {
    firstName: 'Jane',
    lastName: 'Doe',
    phone: '0780000000',
    pregnancyWeeks: 20,
  };

  describe('POST /api/mothers', () => {
    it('should create a new mother when authorized', async () => {
      const res = await request(app)
        .post('/api/mothers')
        .set('Authorization', `Bearer ${token}`)
        .send(testMother);

      expect(res.status).toBe(201);
      expect(res.body.firstName).toBe(testMother.firstName);
      
      const inDb = await Mother.findOne({ phone: testMother.phone });
      expect(inDb).toBeTruthy();
    });

    it('should fail if not authorized', async () => {
      const res = await request(app)
        .post('/api/mothers')
        .send(testMother);

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/mothers/:id/guidance', () => {
    it('should return correct guidance for pregnancy', async () => {
      const mother = await Mother.create(testMother);
      
      const res = await request(app)
        .get(`/api/mothers/${mother._id}/guidance`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.stage).toBe('Pregnancy');
      expect(res.body.friendlyMessage).toMatch(/second trimester/i);
    });

    it('should return postpartum guidance if child exists', async () => {
      const mother = await Mother.create(testMother);
      await Child.create({
        mother: mother._id,
        name: 'Baby Jane',
        dateOfBirth: new Date(),
        sex: 'female',
      });

      const res = await request(app)
        .get(`/api/mothers/${mother._id}/guidance`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.stage).toBe('Postpartum');
    });
  });

  describe('POST /api/mothers/:id/archive-if-eligible', () => {
    it('should archive mother only if child is over 2 years old', async () => {
      const mother = await Mother.create(testMother);
      
      // Case 1: Young child (should not archive)
      await Child.create({
        mother: mother._id,
        dateOfBirth: new Date(), // recent birth
      });

      let res = await request(app)
        .post(`/api/mothers/${mother._id}/archive-if-eligible`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.archived).toBe(false);

      // Case 2: Old child (should archive)
      await Child.deleteMany({});
      const threeYearsAgo = new Date();
      threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
      
      await Child.create({
        mother: mother._id,
        dateOfBirth: threeYearsAgo,
      });

      res = await request(app)
        .post(`/api/mothers/${mother._id}/archive-if-eligible`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.archived).toBe(true);
    });
  });
});
