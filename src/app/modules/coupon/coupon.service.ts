import { StatusCodes } from 'http-status-codes';
import AppError from '../../../errors/AppError';
import QueryBuilder from '../../builder/QueryBuilder';
import { IJwtPayload } from '../auth/auth.interface';
import { Service } from '../Service/Service.model';
import { ICoupon } from './coupon.interface';
import { Coupon } from './coupon.model';
import { calculateDiscount } from './coupon.utils';

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

const getCouponByCode = async (orderAmount: number, couponCode: string, service: string, user: IJwtPayload) => {
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


    // //  * first check coupon usage limit exceeded or not
    // //  * if yes then throw error
    // if (coupon.usageLimit && coupon.usageLimit <= coupon.usedCount) {
    //     throw new AppError(StatusCodes.BAD_REQUEST, 'Coupon usage limit exceeded.');
    // }
    // //  * second check user have already used coupon or not 
    // //  * if not set count vaule 1 for the user
    // //  * if yes check userUsageLimitPerUser exists or not
    // //  * * if userUsageLimitPerUser exists then check if he used less than userUsageLimitPerUser or not 
    // //  * * * if yes then increase the count by 1 and finally increase the usedCount by 1
    // //  * * * if no then throw error
    // //  * * if userUsageLimitPerUser not exists then increase the count by 1 and finally increase the usedCount by 1

    // const couponUsedCountByUser = coupon.couponUsedCountByUser.find((couponUser) => couponUser.user.toString() === user.id.toString());
    // if (couponUsedCountByUser) {
    //     if (coupon.userUsageLimitPerUser) {
    //         if (couponUsedCountByUser.count < coupon.userUsageLimitPerUser) {
    //             await Coupon.updateOne({ _id: coupon._id }, { couponUsedCountByUser: { user: user.id.toString(), count: couponUsedCountByUser.count + 1 }, usedCount: coupon.usedCount + 1 });
    //         } else {
    //             throw new AppError(StatusCodes.BAD_REQUEST, 'You have already used this coupon.');
    //         }
    //     } else {
    //         await Coupon.updateOne({ _id: coupon._id }, { couponUsedCountByUser: { user: user.id.toString(), count: couponUsedCountByUser.count + 1 }, usedCount: coupon.usedCount + 1 });
    //     }
    // } else {
    //     await Coupon.updateOne({ _id: coupon._id }, { couponUsedCountByUser: { user: user.id.toString(), count: 1 }, usedCount: coupon.usedCount + 1 });
    // }



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

    const service = await Service.findById(coupon.service);
    if (!service) {
        throw new AppError(StatusCodes.NOT_FOUND, 'Service not found');
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
