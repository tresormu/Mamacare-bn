import { Router } from 'express';
import * as childrenController from '../controllers/childrenController';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

/**
 * @openapi
 * /api/children:
 *   get:
 *     summary: List all children with mother info and next vaccine appointment
 *     tags: [Children]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all children
 */
router.get('/', requireAuth, requireRole('admin', 'doctor', 'chw'), childrenController.listAllChildren);

/**
 * @openapi
 * /api/children/register:
 *   post:
 *     summary: Register a new child and create vaccination schedule
 *     tags: [Children]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [motherId, dateOfBirth]
 *             properties:
 *               motherId: { type: string }
 *               name: { type: string }
 *               dateOfBirth: { type: string, format: date-time }
 *               sex: { type: string, enum: [female, male] }
 *     responses:
 *       201:
 *         description: Child registered and schedule generated
 */
router.post('/register', requireAuth, requireRole('admin', 'doctor', 'chw'), childrenController.registerChild);

/**
 * @openapi
 * /api/children/mother/{motherId}:
 *   get:
 *     summary: Get all children of a specific mother
 *     tags: [Children]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: motherId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of children
 */
router.get('/mother/:motherId', requireAuth, requireRole('admin', 'doctor', 'chw'), childrenController.getMotherChildren);

export default router;

