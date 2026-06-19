"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FundCategoryController = void 0;
const fund_category_service_1 = require("./fund-category.service");
class FundCategoryController {
    static async getFundCategories(req, res, next) {
        try {
            const parokiId = req.user.parokiId;
            const categories = await fund_category_service_1.FundCategoryService.getFundCategories(parokiId);
            res.status(200).json({
                status: 'success',
                data: {
                    categories,
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async createFundCategory(req, res, next) {
        try {
            const parokiId = req.user.parokiId;
            const category = await fund_category_service_1.FundCategoryService.createFundCategory(parokiId, req.body);
            res.status(201).json({
                status: 'success',
                message: 'Pos Dana berhasil disimpan',
                data: {
                    category,
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async updateFundCategory(req, res, next) {
        try {
            const parokiId = req.user.parokiId;
            const id = req.params.id;
            const category = await fund_category_service_1.FundCategoryService.updateFundCategory(parokiId, id, req.body);
            res.status(200).json({
                status: 'success',
                message: 'Pos Dana berhasil diperbarui',
                data: {
                    category,
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async deleteFundCategory(req, res, next) {
        try {
            const parokiId = req.user.parokiId;
            const id = req.params.id;
            await fund_category_service_1.FundCategoryService.deleteFundCategory(parokiId, id);
            res.status(200).json({
                status: 'success',
                message: 'Pos Dana berhasil dihapus',
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async getFundBalances(req, res, next) {
        try {
            const parokiId = req.user.parokiId;
            const balances = await fund_category_service_1.FundCategoryService.getFundBalances(parokiId);
            res.status(200).json(balances);
        }
        catch (error) {
            next(error);
        }
    }
    static async transferBalance(req, res, next) {
        try {
            const parokiId = req.user.parokiId;
            const userId = req.user.id;
            const { source_fund_category_id, target_fund_category_id, amount, description } = req.body;
            const result = await fund_category_service_1.FundCategoryService.transferBalance(parokiId, userId, {
                sourceFundCategoryId: source_fund_category_id,
                targetFundCategoryId: target_fund_category_id,
                amount,
                description,
            });
            res.status(200).json({
                status: 'success',
                message: 'Pemindahan saldo Pos Dana berhasil dilakukan',
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.FundCategoryController = FundCategoryController;
