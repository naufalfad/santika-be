import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import './config/database'; // Initializes and tests DB connection
import { errorHandler } from './common/middleware/error.middleware';
import authRouter from './modules/auth/auth.routes';
import usersRouter from './modules/users/users.routes';
import kasMasukRouter from './modules/kas-masuk/kas-masuk.routes';
import kasKeluarRouter from './modules/kas-keluar/kas-keluar.routes';
import anggaranRouter from './modules/anggaran/anggaran.routes';
import approvalRouter from './modules/approval/approval.routes';
import profileRouter from './modules/profile/profile.routes';
import fundCategoryRouter from './modules/fund-category/fund-category.routes';
import incomeTypeRouter from './modules/income-type/income-type.routes';
import expenseTypeRouter from './modules/expense-type/expense-type.routes';
import cashTransactionRouter from './modules/cash-transaction/cash-transaction.routes';
import path from 'path';

const app = express();

// Security Middlewares
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors());

// Serve static uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/kas/masuk', kasMasukRouter);
app.use('/api/v1/kas/keluar', kasKeluarRouter);
app.use('/api/v1/anggaran', anggaranRouter);
app.use('/api/v1/approvals', approvalRouter);
app.use('/api/v1/profile', profileRouter);
app.use('/api/v1/fund-categories', fundCategoryRouter);
app.use('/api/v1/income-types', incomeTypeRouter);
app.use('/api/v1/expense-types', expenseTypeRouter);
app.use('/api/v1/cash', cashTransactionRouter);

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
});

