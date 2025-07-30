import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import dashboardService from './dashboard.service';

const getDashboardSummary = catchAsync(async (req: Request, res: Response) => {
  const result = await dashboardService.getDashboardSummary();

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Dashboard summary retrieved successfully',
    data: result,
  });
});

const getMonthlyUserStats = catchAsync(async (req: Request, res: Response) => {
  const { year } = req.query;
  const result = await dashboardService.getMonthlyUserStats(
    year ? parseInt(year as string) : undefined
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Monthly user statistics retrieved successfully',
    data: result,
  });
});

const getDownloadStats = catchAsync(async (req: Request, res: Response) => {
  const result = await dashboardService.getDownloadStats();

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Download statistics retrieved successfully',
    data: result,
  });
});

const getRevenueAnalytics = catchAsync(async (req: Request, res: Response) => {
  const { year } = req.query;
  const result = await dashboardService.getRevenueAnalytics(
    year ? parseInt(year as string) : undefined
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Revenue analytics retrieved successfully',
    data: result,
  });
});

export const DashboardController = {
  getDashboardSummary,
  getMonthlyUserStats,
  getDownloadStats,
  getRevenueAnalytics,
};
