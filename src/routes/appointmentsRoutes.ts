import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { requireAuth, requireRole } from '../middleware/auth';
import { updateAppointmentStatus } from '../controllers/appointmentsController';

const router = Router();

const statusSchema = z.object({
  body: z.object({
    status: z.enum(['scheduled', 'completed', 'missed', 'canceled']),
  }),
});

/**
 * @openapi
 * /api/appointments/{id}/status:
 *   patch:
 *     summary: Update appointment status and trigger follow-up if missed 4 times
 *     tags: [Appointments]
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
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [scheduled, completed, missed, canceled] }
 *     responses:
 *       200:
 *         description: Status updated successfully
 *       404:
 *         description: Appointment not found
 */
router.patch('/:id/status', requireAuth, requireRole('admin', 'doctor'), validate(statusSchema), updateAppointmentStatus);

export default router;

