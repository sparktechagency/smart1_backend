import { StatusCodes } from 'http-status-codes';
import QueryBuilder from '../../builder/QueryBuilder';
import { ICoupon } from './coupon.interface';
import { Coupon } from './coupon.model';
import { IJwtPayload } from '../auth/auth.interface';
import AppError from '../../../errors/AppError';
import { USER_ROLES } from '../user/user.enums';
import { calculateDiscount } from './coupon.utils';
import { Service } from '../Service/Service.model';

const createCoupon = async (couponData: Partial<ICoupon>, user: IJwtPayload) => {
    const service = await Service.findById(couponData.service);
    if (!service) {
        throw new AppError(StatusCodes.NOT_FOUND, 'Service not found');
    }

    const coupon = new Coupon({
        ...couponData,
        service: service._id,
        createdBy: user.id,
    });
    return await coupon.save();
};

const getAllCoupon = async (query: Record<string, unknown>) => {
    const brandQuery = new QueryBuilder(Coupon.find(), query)
        .search(['code'])
        .filter()
        .sort()
        .paginate()
        .fields();

    const result = await brandQuery.modelQuery;
    const meta = await brandQuery.countTotal();

    return {
        meta,
        result,
    };
};

const getAllUnpaginatedCoupon = async (query: Record<string, unknown>) => {
    const brandQuery = new QueryBuilder(Coupon.find(), query)
        .search(['code'])
        .filter()
        .sort()
        .fields();

    const result = await brandQuery.modelQuery;

    return result;
};

const updateCoupon = async (payload: Partial<ICoupon>, couponCode: string, user: IJwtPayload) => {
    console.log({ payload, couponCode });

    const currentDate = new Date();

    const coupon = await Coupon.findOne({ code: couponCode });

    if (!coupon) {
        throw new AppError(StatusCodes.NOT_FOUND, 'Coupon not found.');
    }

    if (coupon.endDate < currentDate) {
        throw new AppError(StatusCodes.BAD_REQUEST, 'Coupon has expired.');
    }
    const service = await Service.findById(coupon.service);
    if (!service) {
        throw new AppError(StatusCodes.NOT_FOUND, 'Service not found');
    }


    const updatedCoupon = await Coupon.findByIdAndUpdate(
        coupon._id,
        { $set: payload },
        { new: true, runValidators: true }
    );

    return updatedCoupon;
};

const getCouponByCode = async (orderAmount: number, couponCode: string, service: string) => {
    const currentDate = new Date();

    const coupon = await Coupon.findOne({ code: couponCode });

    if (!coupon) {
        throw new AppError(StatusCodes.NOT_FOUND, 'Coupon not found.');
    }

    if (!coupon.isActive) {
        throw new AppError(StatusCodes.BAD_REQUEST, 'Coupon is inactive.');
    }

    if (coupon.endDate < currentDate) {
        throw new AppError(StatusCodes.BAD_REQUEST, 'Coupon has expired.');
    }

    if (coupon.startDate > currentDate) {
        throw new AppError(StatusCodes.BAD_REQUEST, 'Coupon has not started.');
    }

    if (coupon.minOrderAmount && orderAmount < coupon.minOrderAmount) {
        throw new AppError(StatusCodes.BAD_REQUEST, 'Below Minimum order amount');
    }

    if (!(service === coupon.service.toString())) {
        throw new AppError(StatusCodes.BAD_REQUEST, 'Coupon is not applicable on your selected service!');
    }

    const discountAmount = calculateDiscount(coupon, orderAmount);

    const discountedPrice = orderAmount - discountAmount;

    return { coupon, discountedPrice, discountAmount };
};

const deleteCoupon = async (couponId: string, user: IJwtPayload) => {
    const coupon = await Coupon.findById(couponId);

    if (!coupon) {
        throw new AppError(StatusCodes.NOT_FOUND, 'Coupon not found.');
    }

    const service = await Service.findById(coupon.service);
    if (!service) {
        throw new AppError(StatusCodes.NOT_FOUND, 'Service not found');
    }

    await Coupon.updateOne({ _id: coupon._id }, { isDeleted: true, deletedAt: new Date() });

    return { message: 'Coupon deleted successfully.' };
};

const getAllCouponByServiceId = async (serviceId: string, user: IJwtPayload) => {
    const service = await Service.findById(serviceId);
    if (!service) {
        throw new AppError(StatusCodes.NOT_FOUND, 'Service not found');
    }


    const coupon = await Coupon.find({ service: serviceId });

    return coupon;
};

const getCouponById = async (couponId: string) => {
    const coupon = await Coupon.findById(couponId);

    return coupon;
};

export const CouponService = {
    createCoupon,
    getAllCoupon,
    getAllUnpaginatedCoupon,
    updateCoupon,
    getCouponByCode,
    deleteCoupon,
    getAllCouponByServiceId,
    getCouponById,
};
