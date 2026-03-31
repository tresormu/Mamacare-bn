import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { chat, chatSchema } from '../controllers/aiController';

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Too many AI requests, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const router = Router();

/**
 * @openapi
 * /api/ai/chat:
 *   post:
 *     summary: Chat with MamaCare+ AI assistant
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message]
 *             properties:
 *               message:
 *                 type: string
 *                 maxLength: 2000
 *               motherId:
 *                 type: string
 *                 description: Optional — enriches AI context with the mother's data
 *               history:
 *                 type: array
 *                 maxItems: 20
 *                 items:
 *                   type: object
 *                   properties:
 *                     role:
 *                       type: string
 *                       enum: [user, assistant]
 *                     content:
 *                       type: string
 *     responses:
 *       200:
 *         description: AI reply
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 reply:
 *                   type: string
 *                 model:
 *                   type: string
 *                 usage:
 *                   type: object
 */
router.post('/chat', requireAuth, aiLimiter, validate(chatSchema), chat);

export default router;
