import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
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
import { notFound, errorHandler } from './middleware/error';
import { requireAuth } from './middleware/auth';
import { env, allowedOrigins } from './config/env';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: allowedOrigins }));
  app.use(express.json({ limit: '10kb' }));
  app.use(morgan(env === 'production' ? 'combined' : 'dev'));

  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  app.use('/api/auth', authRoutes);

  app.use('/api/mothers', requireAuth, mothersRoutes);
  app.use('/api/appointments', requireAuth, appointmentsRoutes);
  app.use('/api/dashboard', requireAuth, dashboardRoutes);
  app.use('/api/children', requireAuth, childrenRoutes);
  app.use('/api/health', healthRoutes);
  app.use('/api/follow-ups', requireAuth, followUpsRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/doctors', doctorsRoutes);
  app.use('/api/payment', paymentRoutes);
  app.use('/api/ai', aiRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
