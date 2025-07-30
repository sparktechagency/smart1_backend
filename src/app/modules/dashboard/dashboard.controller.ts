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

const getDateWiseBookingCountSummary = catchAsync(async (req: Request, res: Response) => {
  const { date } = req.query;
  const result = await dashboardService.getDateWiseBookingCountSummary(
    date ? new Date(date as string) : undefined
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Datewise booking summary retrieved successfully',
    data: result,
  });
});

const getDateWiseAndStatusWiseBookingSummary = catchAsync(async (req: Request, res: Response) => {

  const result = await dashboardService.getDateWiseAndStatusWiseBookingSummary(req.query);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Datewise and statuswise booking summary retrieved successfully',
    data: result,
  });
});

const getCustomers = catchAsync(async (req: Request, res: Response) => {
  const result = await dashboardService.getCustomers(req.query);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Customers retrieved successfully',
    data: result,
  });
});

const getServiceProviders = catchAsync(async (req: Request, res: Response) => {
  const result = await dashboardService.getServiceProviders(req.query);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Service providers retrieved successfully',
    data: result,
  });
});

export const DashboardController = {
  getDashboardSummary,
  getMonthlyUserStats,
  // getDownloadStats,
  getRevenueAnalytics,
  getDateWiseBookingCountSummary,
  getDateWiseAndStatusWiseBookingSummary,
  getCustomers,
  getServiceProviders,
};
