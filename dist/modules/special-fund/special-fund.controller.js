"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpecialFundController = void 0;
const special_fund_service_1 = require("./special-fund.service");
class SpecialFundController {
    static async createSpecialFund(req, res, next) {
        try {
            const parokiId = req.user.parokiId;
            const userId = req.user.id;
            const result = await special_fund_service_1.SpecialFundService.createSpecialFund(parokiId, userId, req.body);
            res.status(201).json({
                status: 'success',
                message: 'Dana Khusus berhasil dibuat',
                data: { specialFund: result },
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async getSpecialFunds(req, res, next) {
        try {
            const parokiId = req.user.parokiId;
            const { status } = req.query;
            const result = await special_fund_service_1.SpecialFundService.getSpecialFunds(parokiId, status);
            res.status(200).json(result);
        }
        catch (error) {
            next(error);
        }
    }
    static async getSpecialFundById(req, res, next) {
        try {
            const parokiId = req.user.parokiId;
            const id = req.params.id;
            const result = await special_fund_service_1.SpecialFundService.getSpecialFundById(parokiId, id);
            res.status(200).json(result);
        }
        catch (error) {
            next(error);
        }
    }
    static async updateSpecialFund(req, res, next) {
        try {
            const parokiId = req.user.parokiId;
            const id = req.params.id;
            const userId = req.user.id;
            const result = await special_fund_service_1.SpecialFundService.updateSpecialFund(parokiId, id, userId, req.body);
            res.status(200).json({
                status: 'success',
                message: 'Dana Khusus berhasil diperbarui',
                data: { specialFund: result },
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async deleteSpecialFund(req, res, next) {
        try {
            const parokiId = req.user.parokiId;
            const id = req.params.id;
            const userId = req.user.id;
            await special_fund_service_1.SpecialFundService.deleteSpecialFund(parokiId, id, userId);
            res.status(200).json({
                status: 'success',
                message: 'Dana Khusus berhasil dihapus',
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async activateSpecialFund(req, res, next) {
        try {
            const parokiId = req.user.parokiId;
            const id = req.params.id;
            const userId = req.user.id;
            const result = await special_fund_service_1.SpecialFundService.activateSpecialFund(parokiId, id, userId);
            res.status(200).json({
                status: 'success',
                message: 'Dana Khusus berhasil diaktifkan',
                data: { specialFund: result },
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async closeSpecialFund(req, res, next) {
        try {
            const parokiId = req.user.parokiId;
            const id = req.params.id;
            const userId = req.user.id;
            const result = await special_fund_service_1.SpecialFundService.closeSpecialFund(parokiId, id, userId);
            res.status(200).json({
                status: 'success',
                message: 'Dana Khusus berhasil ditutup',
                data: { specialFund: result },
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async allocateRemainingBalance(req, res, next) {
        try {
            const parokiId = req.user.parokiId;
            const id = req.params.id;
            const userId = req.user.id;
            const result = await special_fund_service_1.SpecialFundService.allocateRemainingBalance(parokiId, id, userId, req.body);
            res.status(200).json({
                status: 'success',
                message: 'Sisa saldo Dana Khusus berhasil dialokasikan',
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async getSpecialFundTransactions(req, res, next) {
        try {
            const parokiId = req.user.parokiId;
            const id = req.params.id;
            const result = await special_fund_service_1.SpecialFundService.getSpecialFundTransactions(parokiId, id);
            res.status(200).json(result);
        }
        catch (error) {
            next(error);
        }
    }
    static async getSpecialFundReport(req, res, next) {
        try {
            const parokiId = req.user.parokiId;
            const id = req.params.id;
            const result = await special_fund_service_1.SpecialFundService.getSpecialFundReport(parokiId, id);
            res.status(200).json(result);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.SpecialFundController = SpecialFundController;
