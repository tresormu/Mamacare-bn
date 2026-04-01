import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { requireAuth, requireRole } from '../middleware/auth';
import {
  addChild,
  archiveMotherIfEligible,
  createMother,
  getGuidance,
  getMother,
  listMothers,
  updateMother,
} from '../controllers/mothersController';
import { createAppointment, getMotherAppointments } from '../controllers/appointmentsController';

const router = Router();

const motherSchema = z.object({
  body: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    phone: z.string().min(5),
    dateOfBirth: z.string().optional(),
    pregnancyWeeks: z.number().int().min(0).optional(),
    parity: z.number().int().min(0).optional(),
    riskFlags: z.array(z.string()).optional(),
    preferredLanguage: z.string().optional(),
    appOptIn: z.boolean().optional(),
    babyNickname: z.string().optional(),
    assignedDoctor: z.string().optional(),
    assignedCHW: z.string().optional(),
    hasChildUnderTwo: z.boolean().optional(),
    existingChildren: z.array(z.object({
      name: z.string().optional(),
      dateOfBirth: z.string().datetime(),
      sex: z.enum(['female', 'male']).optional(),
      weightKg: z.number().min(0).optional(),
    })).optional(),
  }),
});

const childSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    dateOfBirth: z.string().datetime(),
    sex: z.enum(['female', 'male']).optional(),
  }),
});

const appointmentSchema = z.object({
  body: z.object({
    type: z.enum(['ANC', 'PNC', 'VACCINE', 'OTHER']),
    scheduledFor: z.string().datetime(),
    child: z.string().optional(),
    notes: z.string().optional(),
  }),
});

const motherUpdateSchema = z.object({
  body: z.object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    phone: z.string().min(5).optional(),
    email: z.string().email().optional(),
    dateOfBirth: z.string().optional(),
    pregnancyWeeks: z.number().int().min(0).optional(),
    parity: z.number().int().min(0).optional(),
    riskFlags: z.array(z.string()).optional(),
    preferredLanguage: z.string().optional(),
    appOptIn: z.boolean().optional(),
    babyNickname: z.string().optional(),
    assignedDoctor: z.string().optional(),
    assignedCHW: z.string().optional(),
    status: z.enum(['active', 'archived']).optional(),
  }),
});

/**
 * @openapi
 * /api/mothers:
 *   post:
 *     summary: Register a new mother
 *     tags: [Mothers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Mother'
 *     responses:
 *       201:
 *         description: Mother registered successfully
 */
router.post('/', requireAuth, requireRole('admin', 'doctor', 'chw'), validate(motherSchema), createMother);

/**
 * @openapi
 * /api/mothers:
 *   get:
 *     summary: List mothers with optional status filter
 *     tags: [Mothers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, archived]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of mothers
 */
router.get('/', requireAuth, requireRole('admin', 'doctor', 'chw'), listMothers);

/**
 * @openapi
 * /api/mothers/{id}:
 *   get:
 *     summary: Get mother details
 *     tags: [Mothers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Mother details
 *       404:
 *         description: Mother not found
 */
router.get('/:id', requireAuth, getMother);

/**
 * @openapi
 * /api/mothers/{id}:
 *   patch:
 *     summary: Update mother details
 *     tags: [Mothers]
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
 *             $ref: '#/components/schemas/Mother'
 *     responses:
 *       200:
 *         description: Mother updated successfully
 */
router.patch('/:id', requireAuth, validate(motherUpdateSchema), updateMother);

/**
 * @openapi
 * /api/mothers/{id}/children:
 *   post:
 *     summary: Add a child to a mother
 *     tags: [Mothers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Child added successfully
 */
router.post('/:id/children', requireAuth, requireRole('admin', 'doctor', 'chw'), validate(childSchema), addChild);

/**
 * @openapi
 * /api/mothers/{id}/appointments:
 *   post:
 *     summary: Schedule an appointment for a mother
 *     tags: [Mothers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Appointment scheduled
 */
router.post('/:id/appointments', requireAuth, requireRole('admin', 'doctor'), validate(appointmentSchema), createAppointment);

/**
 * @openapi
 * /api/mothers/{id}/appointments:
 *   get:
 *     summary: List appointments for a mother
 *     tags: [Mothers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [scheduled, completed, missed, canceled]
 *     responses:
 *       200:
 *         description: Appointment list
 */
router.get('/:id/appointments', requireAuth, getMotherAppointments);

/**
 * @openapi
 * /api/mothers/{id}/archive-if-eligible:
 *   post:
 *     summary: Archive mother if all children are over 2 years old
 *     tags: [Mothers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Archiving status
 */
router.post('/:id/archive-if-eligible', requireAuth, requireRole('admin'), archiveMotherIfEligible);

/**
 * @openapi
 * /api/mothers/{id}/guidance:
 *   get:
 *     summary: Get stage-specific guidance for a mother
 *     tags: [Mothers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Guidance messages
 */
router.get('/:id/guidance', requireAuth, getGuidance);

export default router;
