"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApprovalController = void 0;
const approval_service_1 = require("./approval.service");
class ApprovalController {
    static async getApprovals(req, res, next) {
        try {
            const parokiId = req.user.parokiId;
            const actorId = req.user.id;
            const role = req.user.role;
            const filters = {
                status: req.query.status,
                search: req.query.search,
            };
            const approvals = await approval_service_1.ApprovalService.getApprovals(parokiId, actorId, role, filters);
            res.status(200).json({
                status: 'success',
                data: {
                    approvals,
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async createPengajuan(req, res, next) {
        try {
            const parokiId = req.user.parokiId;
            const actorId = req.user.id;
            const newPengajuan = await approval_service_1.ApprovalService.createPengajuan(parokiId, actorId, req.body);
            res.status(201).json({
                status: 'success',
                message: 'Pengajuan proposal berhasil disimpan',
                data: {
                    approval: newPengajuan,
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async updateApprovalStatus(req, res, next) {
        try {
            const parokiId = req.user.parokiId;
            const actorId = req.user.id;
            const role = req.user.role;
            const id = req.params.id;
            const updated = await approval_service_1.ApprovalService.updateApprovalStatus(parokiId, actorId, role, id, req.body);
            res.status(200).json({
                status: 'success',
                message: 'Status pengajuan berhasil diperbarui',
                data: {
                    approval: updated,
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.ApprovalController = ApprovalController;
