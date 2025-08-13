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
     const result = await BookingService.getBookingDetails(req.params.bookingId, req.user as IJwtPayload);

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
     const result = await BookingService.changeBookingStatus(req.params.bookingId, status, req.user as IJwtPayload);

     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Booking status changed succesfully',
          data: result,
     });
});

const cancelBooking = catchAsync(async (req: Request, res: Response) => {
     const { bookingCancelReason } = req.body;
     const result = await BookingService.cancelBooking(req.params.id, bookingCancelReason, req.user as IJwtPayload);

     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Booking cancelled succesfully',
          data: result,
     });
});

const acceptBid = catchAsync(async (req: Request, res: Response) => {
     const { bidId } = req.body;
     const result = await BookingService.acceptBid(req.params.bookingId, bidId, req.user as IJwtPayload);

     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Booking accepted succesfully',
          data: result,
     });
});

const changeAcceptedBid = catchAsync(async (req: Request, res: Response) => {
     const { bidId } = req.body;
     const result = await BookingService.changeAcceptedBid(req.params.bookingId, bidId, req.user as IJwtPayload);

     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Booking accepted succesfully',
          data: result,
     });
});

const getServiceCategoryBasedBookingsForProviderToBid = catchAsync(async (req: Request, res: Response) => {
     const result = await BookingService.getServiceCategoryBasedBookingsForProviderToBid(req.query, req.user as IJwtPayload);

     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Bookings retrive succesfully',
          data: result,
     });
});

const getBidsOfBookingByIdToAccept = catchAsync(async (req: Request, res: Response) => {
     const result = await BookingService.getBidsOfBookingByIdToAccept(req.query, req.params.bookingId, req.user as IJwtPayload);

     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Bids retrive succesfully',
          data: result,
     });
});

const getServiceCategoryBasedBidsToAccept = catchAsync(async (req: Request, res: Response) => {
     const result = await BookingService.getServiceCategoryBasedBidsToAccept(req.query, req.params.serviceCategoryId);

     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Bids retrive succesfully',
          data: result,
     });
});

const reScheduleBookingById = catchAsync(async (req: Request, res: Response) => {
     const result = await BookingService.reScheduleBookingById(req.params.bookingId, req.body, req.user as IJwtPayload);

     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Booking re-scheduled succesfully',
          data: result,
     });
});

const requestCompleteOTP = catchAsync(async (req: Request, res: Response) => {
     const data = await BookingService.requestCompleteOTP(req.params.id, req.user as IJwtPayload);

     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'OTP generated successfully',
          data,
     });
});

const verifyCompleteOTP = catchAsync(async (req: Request, res: Response) => {
     const result = await BookingService.verifyCompleteOTP(req.body, req.user as IJwtPayload);

     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Bid completed successfully',
          data: result,
     });
});

export const BookingController = {
     createBooking,
     getBookingDetails,
     getMyBooking,
     changeBookingStatus,
     cancelBooking,
     acceptBid,
     changeAcceptedBid,
     getServiceCategoryBasedBookingsForProviderToBid,
     getBidsOfBookingByIdToAccept,
     getServiceCategoryBasedBidsToAccept,
     reScheduleBookingById,
     requestCompleteOTP,
     verifyCompleteOTP,
};
