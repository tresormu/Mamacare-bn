import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validate } from '../middleware/validate';
import { login, loginSchema, me, register, registerSchema, activatePatient, activatePatientSchema } from '../controllers/authController';
import { requireAuth } from '../middleware/auth';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: Register a new staff user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string }
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       201:
 *         description: User registered successfully
 *       409:
 *         description: Email already registered
 */
router.post('/register', authLimiter, validate(registerSchema), register);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Login to get JWT
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Successfully logged in
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', authLimiter, validate(loginSchema), login);

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile
 *       401:
 *         description: Unauthorized
 */
router.get('/me', requireAuth, me);

/**
 * @openapi
 * /api/auth/patient/activate:
 *   post:
 *     summary: Activate patient account using PIN from doctor
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone, pinCode, password]
 *             properties:
 *               phone: { type: string }
 *               pinCode: { type: string, minLength: 6, maxLength: 6 }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Account activated, JWT returned
 *       401:
 *         description: Invalid phone or PIN
 *       409:
 *         description: Account already activated
 */
router.post('/patient/activate', authLimiter, validate(activatePatientSchema), activatePatient);

export default router;

