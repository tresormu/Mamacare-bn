import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import mothersRoutes from './routes/mothersRoutes';
import appointmentsRoutes from './routes/appointmentsRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import authRoutes from './routes/authRoutes';
import childrenRoutes from './routes/childrenRoutes';
import healthRoutes from './routes/healthRoutes';
import followUpsRoutes from './routes/followUpsRoutes';
import adminRoutes from './routes/adminRoutes';
import doctorsRoutes from './routes/doctorsRoutes';
import paymentRoutes from './routes/paymentRoutes';
import aiRoutes from './routes/aiRoutes';
import financialRoutes from './routes/financialRoutes';
import { notFound, errorHandler } from './middleware/error';
import { requireAuth } from './middleware/auth';
import { env, allowedOrigins } from './config/env';

export function createApp() {
  const app = express();

  app.use(helmet());
  const corsOrigins = [
    'http://localhost:5173',
    'https://hackthon-web-kappa.vercel.app',
    'https://mamacare-bn.onrender.com',
    'https://hackthon-web-phi.vercel.app',
  ];

  const corsOptions = {
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  };

  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));
  app.use(express.json({ limit: '10kb' }));
  app.use(morgan(env === 'production' ? 'combined' : 'dev'));

  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
    skip: (req) => req.path === '/api/dashboard/sse', // SSE is long-lived, skip rate limiting
  });
  app.use(globalLimiter);

  app.get('/health', (_req, res) => res.json({ ok: true }));
  if (env !== 'production') {
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  }

  app.use('/api/auth', authRoutes);

  app.use('/api/mothers', requireAuth, mothersRoutes);
  app.use('/api/appointments', requireAuth, appointmentsRoutes);
  app.use('/api/dashboard', requireAuth, dashboardRoutes);
  app.use('/api/children', requireAuth, childrenRoutes);
  app.use('/api/health', requireAuth, healthRoutes);
  app.use('/api/follow-ups', requireAuth, followUpsRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/doctors', doctorsRoutes);
  app.use('/api/payment', paymentRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/financial', financialRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
