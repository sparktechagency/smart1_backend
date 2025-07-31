import { Request, Response } from 'express';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { IJwtPayload } from '../auth/auth.interface';
import { IReviews } from './Reviews.interface';
import { ReviewsService } from './Reviews.service';

const createReviews = catchAsync(async (req: Request, res: Response) => {
     const result = await ReviewsService.createReviews(req.body, req.user as IJwtPayload);

     sendResponse<IReviews>(res, {
          statusCode: 200,
          success: true,
          message: 'Reviews created successfully',
          data: result,
     });
});

const getAllReviewsByType = catchAsync(async (req: Request, res: Response) => {
     const result = await ReviewsService.getAllReviewsByTypes(req.params.type, req.query);

     sendResponse<{ meta: { total: number; page: number; limit: number; }; result: IReviews[]; }>(res, {
          statusCode: 200,
          success: true,
          message: 'Reviews retrieved successfully',
          data: result,
     });
});

const getAllUnpaginatedReviewsByType = catchAsync(async (req: Request, res: Response) => {
     const result = await ReviewsService.getAllUnpaginatedReviewsByType(req.params.type);

     sendResponse<IReviews[]>(res, {
          statusCode: 200,
          success: true,
          message: 'Reviews retrieved successfully',
          data: result,
     });
});

const updateReviews = catchAsync(async (req: Request, res: Response) => {
     const { id } = req.params;
     const result = await ReviewsService.updateReviews(id, req.body, req.user as IJwtPayload);

     sendResponse<IReviews>(res, {
          statusCode: 200,
          success: true,
          message: 'Reviews updated successfully',
          data: result || undefined,
     });
});

const deleteReviews = catchAsync(async (req: Request, res: Response) => {
     const { id } = req.params;
     const result = await ReviewsService.deleteReviews(id, req.user as IJwtPayload);

     sendResponse<IReviews>(res, {
          statusCode: 200,
          success: true,
          message: 'Reviews deleted successfully',
          data: result || undefined,
     });
});

const hardDeleteReviews = catchAsync(async (req: Request, res: Response) => {
     const { id } = req.params;
     const result = await ReviewsService.hardDeleteReviews(id);

     sendResponse<IReviews>(res, {
          statusCode: 200,
          success: true,
          message: 'Reviews deleted successfully',
          data: result || undefined,
     });
});

const getReviewsById = catchAsync(async (req: Request, res: Response) => {
     const { id } = req.params;
     const result = await ReviewsService.getReviewsById(id);

     sendResponse<IReviews>(res, {
          statusCode: 200,
          success: true,
          message: 'Reviews retrieved successfully',
          data: result || undefined,
     });
});

const getAllReviewsByBookingId = catchAsync(async (req: Request, res: Response) => {
     const { bookingId } = req.params;
     const result = await ReviewsService.getAllReviewsByBookingId(bookingId, req.query);

     sendResponse<{ meta: { total: number; page: number; limit: number; }; result: IReviews[]; }>(res, {
          statusCode: 200,
          success: true,
          message: 'Reviews retrieved successfully',
          data: result || undefined,
     });
});

export const ReviewsController = {
     createReviews,
     getAllReviewsByType,
     getAllUnpaginatedReviewsByType,
     updateReviews,
     deleteReviews,
     hardDeleteReviews,
     getReviewsById,
     getAllReviewsByBookingId
};
