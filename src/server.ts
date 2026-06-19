import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import './config/database'; // Initializes and tests DB connection
import { errorHandler } from './common/middleware/error.middleware';
import authRouter from './modules/auth/auth.routes';
import usersRouter from './modules/users/users.routes';
import anggaranRouter from './modules/anggaran/anggaran.routes';
import profileRouter from './modules/profile/profile.routes';
import kegiatanRouter from './modules/kegiatan/kegiatan.routes';
import permohonanAnggaranRouter from './modules/permohonan-anggaran/permohonan-anggaran.routes';
import fundCategoryRouter from './modules/fund-category/fund-category.routes';
import incomeTypeRouter from './modules/income-type/income-type.routes';
import expenseTypeRouter from './modules/expense-type/expense-type.routes';
import cashTransactionRouter from './modules/cash-transaction/cash-transaction.routes';
import spjRouter from './modules/spj/spj.routes';
import specialFundRouter from './modules/special-fund/special-fund.routes';
import reportRouter from './modules/report/report.routes';
import auditLogRouter from './modules/audit-log/audit-log.routes';
import { initSpecialFundScheduler } from './modules/special-fund/special-fund.cron';
import path from 'path';

const app = express();

// Security Middlewares
app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: {
    directives: {
      frameAncestors: ["'self'", 'http://localhost:5173', 'http://localhost:3000'],
    },
  },
}));
app.use(cors());

// Serve static uploads with CORS headers
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Cache-Control', 'public, max-age=31536000');
  next();
}, express.static(path.join(process.cwd(), 'uploads')));

// Body Parsers with increased limits
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// API Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/anggaran', anggaranRouter);
app.use('/api/v1/kegiatan', kegiatanRouter);
app.use('/api/v1/permohonan-anggaran', permohonanAnggaranRouter);
app.use('/api/v1/profile', profileRouter);
app.use('/api/v1/fund-categories', fundCategoryRouter);
app.use('/api/v1/income-types', incomeTypeRouter);
app.use('/api/v1/expense-types', expenseTypeRouter);
app.use('/api/v1/cash', cashTransactionRouter);
app.use('/api/v1/spj', spjRouter);
app.use('/api/v1/special-funds', specialFundRouter);
app.use('/api/v1/reports', reportRouter);
app.use('/api/v1/audit-logs', auditLogRouter);

// Health Check Route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// Root Route
app.get('/', (req, res) => {
  res.send('SANTIKA Backend API is running.');
});

// Error handling middleware
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`🚀 Server is listening on port ${env.PORT} in ${env.NODE_ENV} mode.`);
  // Start the Special Fund clean-up job scheduler
  initSpecialFundScheduler();
});

