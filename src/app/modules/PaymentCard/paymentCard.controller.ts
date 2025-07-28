import { Request, Response } from 'express';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { IJwtPayload } from '../auth/auth.interface';
import { IPaymentCard } from './paymentCard.interface';
import { paymentCardService } from './paymentCard.service';

const createPaymentCard = catchAsync(async (req: Request, res: Response) => {
     const result = await paymentCardService.createPaymentCard(req.body, req.user as IJwtPayload);

     sendResponse<IPaymentCard>(res, {
          statusCode: 200,
          success: true,
          message: 'PaymentCard created successfully',
          data: result,
     });
});

const getAllPaymentCards = catchAsync(async (req: Request, res: Response) => {
     const result = await paymentCardService.getAllPaymentCards(req.query);

     sendResponse<{ meta: { total: number; page: number; limit: number; }; result: IPaymentCard[]; }>(res, {
          statusCode: 200,
          success: true,
          message: 'PaymentCards retrieved successfully',
          data: result,
     });
});

const getAllUnpaginatedPaymentCards = catchAsync(async (req: Request, res: Response) => {
     const result = await paymentCardService.getAllUnpaginatedPaymentCards();

     sendResponse<IPaymentCard[]>(res, {
          statusCode: 200,
          success: true,
          message: 'PaymentCards retrieved successfully',
          data: result,
     });
});

const updateMyPaymentCard = catchAsync(async (req: Request, res: Response) => {
     const { cardNo } = req.params;
     const result = await paymentCardService.updateMyPaymentCard(cardNo, req.body, req.user as IJwtPayload);

     sendResponse<IPaymentCard>(res, {
          statusCode: 200,
          success: true,
          message: 'PaymentCard updated successfully',
          data: result || undefined,
     });
});

const deleteMyPaymentCard = catchAsync(async (req: Request, res: Response) => {
     const { id } = req.params;
     const result = await paymentCardService.deleteMyPaymentCard(id, req.user as IJwtPayload);

     sendResponse<IPaymentCard>(res, {
          statusCode: 200,
          success: true,
          message: 'PaymentCard deleted successfully',
          data: result || undefined,
     });
});

const hardDeleteMyPaymentCard = catchAsync(async (req: Request, res: Response) => {
     const { id } = req.params;
     const result = await paymentCardService.hardDeleteMyPaymentCard(id, req.user as IJwtPayload);

     sendResponse<IPaymentCard>(res, {
          statusCode: 200,
          success: true,
          message: 'PaymentCard deleted successfully',
          data: result || undefined,
     });
});

const getMyPaymentCardByCardNo = catchAsync(async (req: Request, res: Response) => {
     const { cardNo } = req.params;
     const result = await paymentCardService.getMyPaymentCardByCardNo(cardNo, req.user as IJwtPayload);

     sendResponse<IPaymentCard>(res, {
          statusCode: 200,
          success: true,
          message: 'PaymentCard retrieved successfully',
          data: result || undefined,
     });
});

const getMyPaymentCards = catchAsync(async (req: Request, res: Response) => {
     const result = await paymentCardService.getMyPaymentCards(req.query, req.user as IJwtPayload);

     sendResponse(res, {
          statusCode: 200,
          success: true,
          message: 'PaymentCards retrieved successfully',
          data: result,
     });
});

export const paymentCardController = {
     createPaymentCard,
     getAllPaymentCards,
     getAllUnpaginatedPaymentCards,
     updateMyPaymentCard,
     deleteMyPaymentCard,
     hardDeleteMyPaymentCard,
     getMyPaymentCardByCardNo,
     getMyPaymentCards,
};
