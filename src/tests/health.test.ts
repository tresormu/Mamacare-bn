import request from 'supertest';
import { createApp } from '../app';

const app = createApp();

describe('Health Controller', () => {
  describe('POST /api/health/assess-symptoms', () => {
    it('should categorize emergency symptoms correctly for a mother', async () => {
      const res = await request(app)
        .post('/api/health/assess-symptoms')
        .send({
          patientType: 'mother',
          symptoms: ['severe_headache', 'vision_blurring'],
        });

      expect(res.status).toBe(200);
      expect(res.body.riskLevel).toBe('EMERGENCY');
      expect(res.body.guidance).toMatch(/Hospital immediately/i);
    });

    it('should categorize monitoring symptoms correctly for an infant', async () => {
      const res = await request(app)
        .post('/api/health/assess-symptoms')
        .send({
          patientType: 'infant',
          symptoms: ['poor_feeding'],
        });

      expect(res.status).toBe(200);
      expect(res.body.riskLevel).toBe('MONITOR');
    });

    it('should categorize empty symptoms as NORMAL', async () => {
      const res = await request(app)
        .post('/api/health/assess-symptoms')
        .send({
          patientType: 'mother',
          symptoms: [],
        });

      expect(res.status).toBe(200);
      expect(res.body.riskLevel).toBe('NORMAL');
    });
  });

  describe('GET /api/health/danger-signs', () => {
    it('should return fixed danger signs lists', async () => {
      const res = await request(app).get('/api/health/danger-signs');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('dangerSigns');
      expect(res.body).toHaveProperty('monitorSigns');
    });
  });
});
