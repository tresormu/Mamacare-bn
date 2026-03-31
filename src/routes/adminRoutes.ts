import { Router } from 'express';
import * as adminController from '../controllers/adminController';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

/**
 * @openapi
 * /api/admin/users:
 *   get:
 *     summary: List all Doctors and CHWs
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of staff users
 */
router.get('/users', requireAuth, requireRole('admin'), adminController.listUsers);

/**
 * @openapi
 * /api/admin/users/{id}:
 *   get:
 *     summary: Get details for a specific staff member
 *     tags: [Admin]
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
 *         description: User details
 */
router.get('/users/:id', requireAuth, requireRole('admin'), adminController.getUserDetails);

/**
 * @openapi
 * /api/admin/users/{id}:
 *   put:
 *     summary: Update staff member details or role
 *     tags: [Admin]
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
 *               name: { type: string }
 *               email: { type: string }
 *               role: { type: string, enum: [doctor, chw] }
 *     responses:
 *       200:
 *         description: User updated successfully
 */
router.put('/users/:id', requireAuth, requireRole('admin'), adminController.updateUser);

/**
 * @openapi
 * /api/admin/users/{id}:
 *   delete:
 *     summary: Delete a staff member from the system
 *     tags: [Admin]
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
 *         description: User deleted
 */
router.delete('/users/:id', requireAuth, requireRole('admin'), adminController.deleteUser);

/**
 * @openapi
 * /api/admin/summary:
 *   get:
 *     summary: Global system metrics dashboard
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System metrics summary
 */
router.get('/summary', requireAuth, requireRole('admin'), adminController.getSystemSummary);

export default router;
