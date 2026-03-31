import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { getFinancialRecords, getFinancialReport } from '../controllers/financialController';

const router = Router();

/**
 * @openapi
 * /api/financial/records:
 *   get:
 *     summary: List financial transaction records with filters
 *     tags: [Financial]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, completed, failed]
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
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
 *         description: Financial records with totals
 */
router.get('/records', requireAuth, requireRole('admin', 'doctor'), getFinancialRecords);

/**
 * @openapi
 * /api/financial/report:
 *   get:
 *     summary: Aggregated financial report — monthly revenue, by-plan breakdown, summary stats
 *     tags: [Financial]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Financial report data
 */
router.get('/report', requireAuth, requireRole('admin', 'doctor'), getFinancialReport);

export default router;
