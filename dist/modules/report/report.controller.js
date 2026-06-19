"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportController = void 0;
const report_service_1 = require("./report.service");
class ReportController {
    static async getBkuReport(req, res, next) {
        try {
            const parokiId = req.user.parokiId;
            const period = req.query.period;
            const search = req.query.search;
            const reportData = await report_service_1.ReportService.getBkuReport(parokiId, period, search);
            res.status(200).json({
                status: 'success',
                data: reportData,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async getCashFlowReport(req, res, next) {
        try {
            const parokiId = req.user.parokiId;
            const period = req.query.period;
            const reportData = await report_service_1.ReportService.getCashFlowReport(parokiId, period);
            res.status(200).json({
                status: 'success',
                data: reportData,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async getBudgetRealisationReport(req, res, next) {
        try {
            const parokiId = req.user.parokiId;
            const year = req.query.year ? parseInt(req.query.year, 10) : undefined;
            const reportData = await report_service_1.ReportService.getBudgetRealisationReport(parokiId, year);
            res.status(200).json({
                status: 'success',
                data: {
                    realisations: reportData,
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.ReportController = ReportController;
