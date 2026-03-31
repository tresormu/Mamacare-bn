import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { getDashboardSummary, getPinAlerts, dismissPinAlert, subscribePinAlerts } from '../controllers/dashboardController';

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

/**
 * @openapi
 * /api/dashboard/alerts:
 *   get:
 *     summary: Get pending PIN alerts for the logged-in doctor
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of undismissed PIN alerts
 */
router.get('/alerts', requireAuth, requireRole('admin', 'doctor', 'chw'), getPinAlerts);

/**
 * @openapi
 * /api/dashboard/alerts/{id}/dismiss:
 *   patch:
 *     summary: Dismiss a PIN alert after noting the PIN
 *     tags: [Dashboard]
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
 *         description: Alert dismissed
 *       404:
 *         description: Alert not found
 */
router.patch('/alerts/:id/dismiss', requireAuth, requireRole('admin', 'doctor', 'chw'), dismissPinAlert);

/**
 * @openapi
 * /api/dashboard/sse:
 *   get:
 *     summary: SSE stream — receive PIN alerts in real time
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: text/event-stream
 */
router.get('/sse', requireAuth, requireRole('admin', 'doctor', 'chw'), subscribePinAlerts);

export default router;

