import { Request, Response, NextFunction } from 'express';
import { CashTransactionService } from './cash-transaction.service';

export class CashTransactionController {
  static async getIncomes(req: Request, res: Response, next: NextFunction) {
    try {
      const parokiId = req.user!.parokiId;
      const filters = {
        fund_category_id: req.query.fund_category_id as string | undefined,
        income_type_id: req.query.income_type_id as string | undefined,
        start_date: req.query.start_date ? new Date(req.query.start_date as string) : undefined,
        end_date: req.query.end_date ? new Date(req.query.end_date as string) : undefined,
        search: req.query.search as string | undefined,
      };

      const incomes = await CashTransactionService.getIncomes(parokiId, filters);

      res.status(200).json({
        status: 'success',
        data: {
          incomes,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getExpenses(req: Request, res: Response, next: NextFunction) {
    try {
      const parokiId = req.user!.parokiId;
      const filters = {
        fund_category_id: req.query.fund_category_id as string | undefined,
        expense_type_id: req.query.expense_type_id as string | undefined,
        start_date: req.query.start_date ? new Date(req.query.start_date as string) : undefined,
        end_date: req.query.end_date ? new Date(req.query.end_date as string) : undefined,
        search: req.query.search as string | undefined,
      };

      const expenses = await CashTransactionService.getExpenses(parokiId, filters);

      res.status(200).json({
        status: 'success',
        data: {
          expenses,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getIncomeById(req: Request, res: Response, next: NextFunction) {
    try {
      const parokiId = req.user!.parokiId;
      const id = req.params.id as string;
      const income = await CashTransactionService.getTransactionById(parokiId, id, 'INCOME');

      res.status(200).json({
        status: 'success',
        data: {
          income,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getExpenseById(req: Request, res: Response, next: NextFunction) {
    try {
      const parokiId = req.user!.parokiId;
      const id = req.params.id as string;
      const expense = await CashTransactionService.getTransactionById(parokiId, id, 'EXPENSE');

      res.status(200).json({
        status: 'success',
        data: {
          expense,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async createIncome(req: Request, res: Response, next: NextFunction) {
    try {
      const parokiId = req.user!.parokiId;
      const userId = req.user!.id;
      const newIncome = await CashTransactionService.createIncome(parokiId, userId, req.body);

      res.status(201).json({
        status: 'success',
        message: 'Kas masuk berhasil dicatat',
        data: {
          income: newIncome,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async createExpense(req: Request, res: Response, next: NextFunction) {
    try {
      const parokiId = req.user!.parokiId;
      const userId = req.user!.id;
      const newExpense = await CashTransactionService.createExpense(
        parokiId,
        userId,
        req.body,
        req.file
      );

      res.status(201).json({
        status: 'success',
        message: 'Kas keluar berhasil dicatat',
        data: {
          expense: newExpense,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
