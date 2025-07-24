import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { IJwtPayload } from '../auth/auth.interface';
import { IPayment } from './Payment.interface';
import { PaymentService } from './Payment.service';

const createPayment = catchAsync(async (req: Request, res: Response) => {
     const result = await PaymentService.createPayment(req.body);

     sendResponse<IPayment>(res, {
          statusCode: 200,
          success: true,
          message: 'Payment created successfully',
          data: result,
     });
});

const getAllPayments = catchAsync(async (req: Request, res: Response) => {
     const result = await PaymentService.getAllPayments(req.query);

     sendResponse<{ meta: { total: number; page: number; limit: number; }; result: IPayment[]; }>(res, {
          statusCode: 200,
          success: true,
          message: 'Payments retrieved successfully',
          data: result,
     });
});

const getAllUnpaginatedPayments = catchAsync(async (req: Request, res: Response) => {
     const result = await PaymentService.getAllUnpaginatedPayments();

     sendResponse<IPayment[]>(res, {
          statusCode: 200,
          success: true,
          message: 'Payments retrieved successfully',
          data: result,
     });
});

const updatePayment = catchAsync(async (req: Request, res: Response) => {
     const { id } = req.params;
     const result = await PaymentService.updatePayment(id, req.body);

     sendResponse<IPayment>(res, {
          statusCode: 200,
          success: true,
          message: 'Payment updated successfully',
          data: result || undefined,
     });
});

const deletePayment = catchAsync(async (req: Request, res: Response) => {
     const { id } = req.params;
     const result = await PaymentService.deletePayment(id);

     sendResponse<IPayment>(res, {
          statusCode: 200,
          success: true,
          message: 'Payment deleted successfully',
          data: result || undefined,
     });
});

const hardDeletePayment = catchAsync(async (req: Request, res: Response) => {
     const { id } = req.params;
     const result = await PaymentService.hardDeletePayment(id);

     sendResponse<IPayment>(res, {
          statusCode: 200,
          success: true,
          message: 'Payment deleted successfully',
          data: result || undefined,
     });
});

const getPaymentById = catchAsync(async (req: Request, res: Response) => {
     const { id } = req.params;
     const result = await PaymentService.getPaymentById(id);

     sendResponse<IPayment>(res, {
          statusCode: 200,
          success: true,
          message: 'Payment retrieved successfully',
          data: result || undefined,
     });
});


const successPage = catchAsync(async (req: Request, res: Response) => {
     // console.log('hit hoise');
     res.render('success.ejs');
});


const cancelPage = catchAsync(async (req: Request, res: Response) => {
     res.render('cancel.ejs');
});


const stripeDuePaymentByBookingId = catchAsync(async (req: Request, res: Response) => {
     const { bookingId } = req.params;

     const result = await PaymentService.stripeDuePaymentByBookingId(bookingId, req.user as IJwtPayload);

     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.OK,
          data: result,
          message: 'PaymentIntent updated successfully!',
     });
});

export const PaymentController = {
     createPayment,
     getAllPayments,
     getAllUnpaginatedPayments,
     updatePayment,
     deletePayment,
     hardDeletePayment,
     getPaymentById,
     successPage,
     cancelPage,
     stripeDuePaymentByBookingId
};
