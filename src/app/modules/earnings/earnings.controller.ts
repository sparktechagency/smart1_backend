import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { IUser } from '../user/user.interface';
import { earningsService } from './earnings.service';
import { DEFAULT_CURRENCY } from '../Bid/Bid.enum';
import AppError from '../../../errors/AppError';
import catchAsync from '../../../shared/catchAsync';
import { StatusCodes } from 'http-status-codes';

export class EarningsController {
  // Get earnings for the authenticated service provider
  getMyEarnings = catchAsync(async (req: Request, res: Response) => {
    const user = req.user as IUser;
    const earnings = await earningsService.getServiceProviderEarnings(user._id);
    
    if (!earnings) {
      throw new AppError(StatusCodes.NOT_FOUND, 'Earnings record not found');
    }
    
    res.status(StatusCodes.OK).json({
      status: 'success',
      data: earnings,
    });
  });

  // Admin: Get earnings for a specific service provider
  getServiceProviderEarnings = catchAsync(async (req: Request, res: Response) => {
    const { serviceProviderId } = req.params;
    
    if (!Types.ObjectId.isValid(serviceProviderId)) {
      throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid service provider ID');
    }
    
    const earnings = await earningsService.getServiceProviderEarnings(new Types.ObjectId(serviceProviderId));
    
    if (!earnings) {
      throw new AppError(StatusCodes.NOT_FOUND, 'Earnings record not found for this service provider');
    }
    
    res.status(StatusCodes.OK).json({
      status: 'success',
      data: earnings,
    });
  });

  // Admin: Get all service providers' earnings with pagination
  getAllEarnings = catchAsync(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    const result = await earningsService.getAllEarnings({}, page, limit);
    
    res.status(StatusCodes.OK).json({
      status: 'success',
      data: result.data,
      meta: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    });
  });

  // Admin: Get earnings summary
  getEarningsSummary = catchAsync(async (req: Request, res: Response) => {
    const summary = await earningsService.getEarningsSummary();
    
    res.status(StatusCodes.OK).json({
      status: 'success',
      data: summary,
    });
  });

  // Admin: Initialize earnings for a service provider
  initializeEarnings = catchAsync(async (req: Request, res: Response) => {
    const { serviceProviderId, currency } = req.body;
    
    if (!Types.ObjectId.isValid(serviceProviderId)) {
      throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid service provider ID');
    }
    
    const earnings = await earningsService.initializeEarnings(
      new Types.ObjectId(serviceProviderId),
      currency || DEFAULT_CURRENCY.SAR_CAPITAL
    );
    
    res.status(StatusCodes.CREATED).json({
      status: 'success',
      data: earnings,
    });
  });
}

export const earningsController = new EarningsController();
