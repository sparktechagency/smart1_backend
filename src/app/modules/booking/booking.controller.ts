import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { IJwtPayload } from '../auth/auth.interface';
import { BookingService } from './booking.service';

const createBooking = catchAsync(async (req: Request, res: Response) => {
     const result = await BookingService.createBooking(req.body, req.user as IJwtPayload);

     sendResponse(res, {
          statusCode: StatusCodes.CREATED,
          success: true,
          message: 'Booking created succesfully',
          data: result,
     });
});


const getBookingDetails = catchAsync(async (req: Request, res: Response) => {
     const result = await BookingService.getBookingDetails(req.params.BookingId, req.user as IJwtPayload);

     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Booking retrive succesfully',
          data: result,
     });
});

const getMyBooking = catchAsync(async (req: Request, res: Response) => {
     const result = await BookingService.getMyBookings(req.query, req.user as IJwtPayload);

     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Booking retrive succesfully',
          data: result,
     });
});

const changeBookingStatus = catchAsync(async (req: Request, res: Response) => {
     const { status } = req.body;
     const result = await BookingService.changeBookingStatus(req.params.BookingId, status, req.user as IJwtPayload);

     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Booking status changed succesfully',
          data: result,
     });
});

const cancelBooking = catchAsync(async (req: Request, res: Response) => {
     const result = await BookingService.cancelBooking(req.params.id, req.user as IJwtPayload);

     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Booking cancelled succesfully',
          data: result,
     });
});


const getAllRefundBookingRequests = catchAsync(async (req: Request, res: Response) => {
     const shopId = req.params.shopId;
     const result = await BookingService.getAllRefundBookingRequests(req.query, req.user as IJwtPayload, shopId);

     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'isNeedRefund Bookings retrive succesfully',
          data: result,
     });
});

const refundBooking = catchAsync(async (req: Request, res: Response) => {
     const result = await BookingService.refundBooking(req.params.BookingId, req.user as IJwtPayload);

     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Booking refunded succesfully',
          data: result,
     });
});

export const BookingController = {
     createBooking,
     getBookingDetails,
     getMyBooking,
     changeBookingStatus,
     cancelBooking,
     getAllRefundBookingRequests,
     refundBooking,
};
