import { Router } from 'express';
import * as doctorsController from '../controllers/doctorsController';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

/**
 * @openapi
 * /api/doctors/chws:
 *   get:
 *     summary: List all CHW users (accessible to doctors)
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of CHWs
 */
router.get('/chws', requireAuth, requireRole('doctor', 'admin', 'chw'), doctorsController.getChws);

/**
 * @openapi
 * /api/doctors/my-patients:
 *   get:
 *     summary: List all patients in the logged-in doctor's hospital (from token)
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         description: Paginated list of patients in the doctor's hospital
 */
/**
 * @openapi
 * /api/doctors/my-mothers:
 *   get:
 *     summary: List mothers assigned to the logged-in doctor
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of assigned mothers
 */
router.get('/my-mothers', requireAuth, requireRole('doctor', 'admin'), doctorsController.getMyMothers);

/**
 * @openapi
 * /api/doctors/my-appointments:
 *   get:
 *     summary: List upcoming appointments for patients assigned to the doctor
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of upcoming appointments
 */
router.get('/my-appointments', requireAuth, requireRole('doctor', 'admin'), doctorsController.getMyAppointments);

/**
 * @openapi
 * /api/doctors/summary:
 *   get:
 *     summary: Clinical dashboard summary for the logged-in doctor
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Personal clinical dashboard summary
 */
router.get('/summary', requireAuth, requireRole('doctor', 'admin'), doctorsController.getDoctorSummary);

export default router;

