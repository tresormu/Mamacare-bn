import { Router } from 'express';
import * as followUpsController from '../controllers/followUpsController';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

/**
 * @openapi
 * /api/follow-ups:
 *   get:
 *     summary: List all open follow-up alerts (admin/doctor/chw)
 *     tags: [FollowUps]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of open follow-ups
 */
router.get('/', requireAuth, requireRole('admin', 'doctor', 'chw'), followUpsController.getOpenFollowUps);

/**
 * @openapi
 * /api/follow-ups/{id}/resolve:
 *   post:
 *     summary: Resolve a follow-up (CHW task) and reset mother's missed count
 *     tags: [FollowUps]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes: { type: string }
 *     responses:
 *       200:
 *         description: Follow-up resolved and mother reset
 *       404:
 *         description: Follow-up not found
 */
router.post('/:id/resolve', requireAuth, requireRole('admin', 'chw'), followUpsController.resolveFollowUp);

export default router;

