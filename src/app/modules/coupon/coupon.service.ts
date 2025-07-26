import { StatusCodes } from 'http-status-codes';
import AppError from '../../../errors/AppError';
import QueryBuilder from '../../builder/QueryBuilder';
import { IJwtPayload } from '../auth/auth.interface';
import { DEFAULT_ADMIN_REVENUE } from '../Bid/Bid.enum';
import { ServiceCategory } from '../ServiceCategory/ServiceCategory.model';
import { COUPON_DISCOUNT_TYPE } from './coupon.enums';
import { ICoupon } from './coupon.interface';
import { Coupon } from './coupon.model';
import { calculateDiscount } from './coupon.utils';
const createCoupon = async (couponData: Partial<ICoupon>, user: IJwtPayload) => {
    const serviceCategory = await ServiceCategory.findById(couponData.serviceCategory);
    if (!serviceCategory) {
        throw new AppError(StatusCodes.NOT_FOUND, 'Service Category not found');
    }

    // if coupon type is percentage can't be more than DEFAULT_ADMIN_REVENUE
    if (couponData.discountType === COUPON_DISCOUNT_TYPE.PERCENTAGE && couponData.discountValue && couponData.discountValue > DEFAULT_ADMIN_REVENUE) {
        throw new AppError(StatusCodes.BAD_REQUEST, 'Coupon discount value is greater than admin default revenue percentage.');
    }
    const coupon = new Coupon({
        ...couponData,
        service: serviceCategory._id,
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
    const serviceCategory = await ServiceCategory.findById(coupon.serviceCategory);
    if (!serviceCategory) {
        throw new AppError(StatusCodes.NOT_FOUND, 'Service Category not found');
    }


    const updatedCoupon = await Coupon.findByIdAndUpdate(
        coupon._id,
        { $set: payload },
        { new: true, runValidators: true }
    );

    return updatedCoupon;
};

const getCouponByCode = async (orderAmount: number, couponCode: string, serviceCategory: string, user: IJwtPayload) => {
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

    if (!(serviceCategory === coupon.serviceCategory.toString())) {
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

    const serviceCategory = await ServiceCategory.findById(coupon.serviceCategory);
    if (!serviceCategory) {
        throw new AppError(StatusCodes.NOT_FOUND, 'Service Category not found');
    }

    await Coupon.updateOne({ _id: coupon._id }, { isDeleted: true, deletedAt: new Date() });

    return { message: 'Coupon deleted successfully.' };
};

const getAllCouponByServiceId = async (serviceCategoryId: string, user: IJwtPayload) => {
    const serviceCategory = await ServiceCategory.findById(serviceCategoryId);
    if (!serviceCategory) {
        throw new AppError(StatusCodes.NOT_FOUND, 'Service Category not found');
    }


    const coupon = await Coupon.find({ service: serviceCategoryId });

    return coupon;
};

const getCouponById = async (couponId: string) => {
    const coupon = await Coupon.findById(couponId);
    if (!coupon) {
        throw new AppError(StatusCodes.NOT_FOUND, 'Coupon not found.');
    }
    return coupon;
};

const deleteCouponHard = async (couponId: string, user: IJwtPayload) => {
    const coupon = await Coupon.findById(couponId);

    if (!coupon) {
        throw new AppError(StatusCodes.NOT_FOUND, 'Coupon not found.');
    }

    const serviceCategory = await ServiceCategory.findById(coupon.serviceCategory);
    if (!serviceCategory) {
        throw new AppError(StatusCodes.NOT_FOUND, 'Service Category not found');
    }

    await Coupon.deleteOne({ _id: coupon._id });

    return { message: 'Coupon deleted successfully.' };
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
    deleteCouponHard,
};
