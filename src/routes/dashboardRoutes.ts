import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { getDashboardSummary } from '../controllers/dashboardController';

const router = Router();

/**
 * @openapi
 * /api/dashboard/summary:
 *   get:
 *     summary: General dashboard statistics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard summary statistics
 */
router.get('/summary', requireAuth, requireRole('admin', 'doctor'), getDashboardSummary);

export default router;

