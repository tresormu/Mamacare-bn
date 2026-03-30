import { Router } from 'express';
import * as healthController from '../controllers/healthController';

const router = Router();

/**
 * @openapi
 * /api/health/assess-symptoms:
 *   post:
 *     summary: Triage symptoms for a mother or infant
 *     tags: [Health]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [patientType, symptoms]
 *             properties:
 *               patientType: { type: string, enum: [mother, infant] }
 *               symptoms: { type: array, items: { type: string } }
 *     responses:
 *       200:
 *         description: Triage result
 */
router.post('/assess-symptoms', healthController.assessSymptoms);

/**
 * @openapi
 * /api/health/danger-signs:
 *   get:
 *     summary: Get information on danger signs
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: List of danger signs
 */
router.get('/danger-signs', healthController.getDangerSigns);

export default router;

