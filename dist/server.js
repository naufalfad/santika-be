"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const env_1 = require("./config/env");
require("./config/database"); // Initializes and tests DB connection
const error_middleware_1 = require("./common/middleware/error.middleware");
const auth_routes_1 = __importDefault(require("./modules/auth/auth.routes"));
const users_routes_1 = __importDefault(require("./modules/users/users.routes"));
const kas_masuk_routes_1 = __importDefault(require("./modules/kas-masuk/kas-masuk.routes"));
const kas_keluar_routes_1 = __importDefault(require("./modules/kas-keluar/kas-keluar.routes"));
const anggaran_routes_1 = __importDefault(require("./modules/anggaran/anggaran.routes"));
const approval_routes_1 = __importDefault(require("./modules/approval/approval.routes"));
const fund_category_routes_1 = __importDefault(require("./modules/fund-category/fund-category.routes"));
const income_type_routes_1 = __importDefault(require("./modules/income-type/income-type.routes"));
const expense_type_routes_1 = __importDefault(require("./modules/expense-type/expense-type.routes"));
const cash_transaction_routes_1 = __importDefault(require("./modules/cash-transaction/cash-transaction.routes"));
const path_1 = __importDefault(require("path"));
const app = (0, express_1.default)();
// Security Middlewares
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
// Serve static uploads
app.use('/uploads', express_1.default.static(path_1.default.join(process.cwd(), 'uploads')));
// Body Parsers
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// API Routes
app.use('/api/v1/auth', auth_routes_1.default);
app.use('/api/v1/users', users_routes_1.default);
app.use('/api/v1/kas/masuk', kas_masuk_routes_1.default);
app.use('/api/v1/kas/keluar', kas_keluar_routes_1.default);
app.use('/api/v1/anggaran', anggaran_routes_1.default);
app.use('/api/v1/approvals', approval_routes_1.default);
app.use('/api/v1/fund-categories', fund_category_routes_1.default);
app.use('/api/v1/income-types', income_type_routes_1.default);
app.use('/api/v1/expense-types', expense_type_routes_1.default);
app.use('/api/v1/cash', cash_transaction_routes_1.default);
// Health Check Route
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date() });
});
// Root Route
app.get('/', (req, res) => {
    res.send('SANTIKA Backend API is running.');
});
// Error handling middleware
app.use(error_middleware_1.errorHandler);
app.listen(env_1.env.PORT, () => {
    console.log(`🚀 Server is listening on port ${env_1.env.PORT} in ${env_1.env.NODE_ENV} mode.`);
});
