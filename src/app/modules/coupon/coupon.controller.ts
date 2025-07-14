import { Request, Response } from 'express';
import { CouponService } from './coupon.service';
import { StatusCodes } from 'http-status-codes';
import { IJwtPayload } from '../auth/auth.interface';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';

const createCoupon = catchAsync(async (req: Request, res: Response) => {
   const result = await CouponService.createCoupon(req.body, req.user as IJwtPayload);

   sendResponse(res, {
      statusCode: StatusCodes.CREATED,
      success: true,
      message: 'Coupon created successfully',
      data: result,
   });
});

const getAllCoupon = catchAsync(async (req: Request, res: Response) => {
   const result = await CouponService.getAllCoupon(req.query);

   sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Coupon fetched successfully',
      data: result,
   });
});

const getAllUnpaginatedCoupon = catchAsync(async (req: Request, res: Response) => {
   const result = await CouponService.getAllUnpaginatedCoupon(req.query);

   sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Coupon fetched successfully',
      data: result,
   });
});

const updateCoupon = catchAsync(async (req: Request, res: Response) => {
   const { couponCode } = req.params;
   const result = await CouponService.updateCoupon(req.body, couponCode, req.user as IJwtPayload);

   sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Coupon updated successfully',
      data: result,
   });
});

const getCouponByCode = catchAsync(async (req: Request, res: Response) => {
   const { couponCode } = req.params;
   const { orderAmount, service } = req.body;

   const result = await CouponService.getCouponByCode(orderAmount, couponCode, service);

   sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Coupon fetched successfully',
      data: result,
   });
});
const deleteCoupon = catchAsync(async (req: Request, res: Response) => {
   const { couponId } = req.params;

   const result = await CouponService.deleteCoupon(couponId, req.user as IJwtPayload);

   res.status(StatusCodes.OK).json({
      statusCode: StatusCodes.OK,
      success: true,
      message: result.message,
      data: null,
   });
});

const getAllCouponByServiceId = catchAsync(async (req: Request, res: Response) => {
   const { serviceId } = req.params;

   const result = await CouponService.getAllCouponByServiceId(serviceId, req.user as IJwtPayload);

   sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Coupon fetched successfully',
      data: result,
   });
});

const getCouponById = catchAsync(async (req: Request, res: Response) => {
   const { couponId } = req.params;

   const result = await CouponService.getCouponById(couponId);

   sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Coupon fetched successfully',
      data: result,
   });
});

export const CouponController = {
   createCoupon,
   getAllCoupon,
   getAllUnpaginatedCoupon,
   updateCoupon,
   getCouponByCode,
   deleteCoupon,
   getAllCouponByServiceId,
   getCouponById,
};
