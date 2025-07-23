import { Request, Response } from 'express';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { IBid } from './Bid.interface';
import { BidService } from './Bid.service';
import { IJwtPayload } from '../auth/auth.interface';

const createBid = catchAsync(async (req: Request, res: Response) => {
     const result = await BidService.createBid(req.body, req.user as IJwtPayload);

     sendResponse<IBid>(res, {
          statusCode: 200,
          success: true,
          message: 'Bid created successfully',
          data: result,
     });
});

const getAllBids = catchAsync(async (req: Request, res: Response) => {
     const result = await BidService.getAllBids(req.query);

     sendResponse<{ meta: { total: number; page: number; limit: number; }; result: IBid[]; }>(res, {
          statusCode: 200,
          success: true,
          message: 'Bids retrieved successfully',
          data: result,
     });
});

const getAllUnpaginatedBids = catchAsync(async (req: Request, res: Response) => {
     const result = await BidService.getAllUnpaginatedBids();

     sendResponse<IBid[]>(res, {
          statusCode: 200,
          success: true,
          message: 'Bids retrieved successfully',
          data: result,
     });
});

const updateBid = catchAsync(async (req: Request, res: Response) => {
     const { id } = req.params;
     const result = await BidService.updateBid(id, req.body);

     sendResponse<IBid>(res, {
          statusCode: 200,
          success: true,
          message: 'Bid updated successfully',
          data: result || undefined,
     });
});

const deleteBid = catchAsync(async (req: Request, res: Response) => {
     const { id } = req.params;
     const result = await BidService.deleteBid(id);

     sendResponse<IBid>(res, {
          statusCode: 200,
          success: true,
          message: 'Bid deleted successfully',
          data: result || undefined,
     });
});

const hardDeleteBid = catchAsync(async (req: Request, res: Response) => {
     const { id } = req.params;
     const result = await BidService.hardDeleteBid(id);

     sendResponse<IBid>(res, {
          statusCode: 200,
          success: true,
          message: 'Bid deleted successfully',
          data: result || undefined,
     });
});

const getBidById = catchAsync(async (req: Request, res: Response) => {
     const { id } = req.params;
     const result = await BidService.getBidById(id);

     sendResponse<IBid>(res, {
          statusCode: 200,
          success: true,
          message: 'Bid retrieved successfully',
          data: result || undefined,
     });
});

const getAllBidsByServiceCategoryId = catchAsync(async (req: Request, res: Response) => {
     const { serviceCategoryId } = req.params;
     const result = await BidService.getAllBidsByServiceCategoryId(serviceCategoryId, req.query);

     sendResponse<{ meta: { total: number; page: number; limit: number; }; result: IBid[]; }>(res, {
          statusCode: 200,
          success: true,
          message: 'Bids retrieved successfully',
          data: result || undefined,
     });
});

const changeBidStatus = catchAsync(async (req: Request, res: Response) => {
     const { id } = req.params;
     const result = await BidService.changeBidStatus(id, req.body.status, req.user as IJwtPayload);

     sendResponse<IBid>(res, {
          statusCode: 200,
          success: true,
          message: 'Bid status changed successfully',
          data: result || undefined,
     });
});

const cancelBid = catchAsync(async (req: Request, res: Response) => {
     const { id } = req.params;
     const result = await BidService.cancelBid(id, req.body.reason, req.user as IJwtPayload);

     sendResponse<IBid>(res, {
          statusCode: 200,
          success: true,
          message: 'Bid cancelled successfully',
          data: result || undefined,
     });
});

export const BidController = {
     createBid,
     getAllBids,
     getAllUnpaginatedBids,
     updateBid,
     deleteBid,
     hardDeleteBid,
     getBidById,
     getAllBidsByServiceCategoryId,
     changeBidStatus,
     cancelBid
};
