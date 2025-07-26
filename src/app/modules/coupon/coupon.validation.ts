import { z } from 'zod';
import { objectIdSchemaOptional } from '../user/user.validation';
import { COUPON_DISCOUNT_TYPE } from './coupon.enums';

export const createCouponSchema = z.object({
    body: z.object({
        code: z.string(),
        serviceCategory: objectIdSchemaOptional,
        discountType: z.enum([...Object.values(COUPON_DISCOUNT_TYPE)] as [string, ...string[]]),
        discountValue: z.number(),
        maxDiscountAmount: z.number().optional(),
        startDate: z.string(),
        endDate: z.string(),
        minOrderAmount: z.number().optional(),
        name: z.string(),
        description: z.string().optional(),
        usageLimit: z.number().optional(),
        userUsageLimitPerUser: z.number().optional(),
        applicableServices: z.array(objectIdSchemaOptional).optional(),
        applicableServiceCategories: z.array(objectIdSchemaOptional).optional(),
    })
});

export const updateCouponSchema = z.object({
    body: z.object({
        code: z.string().optional(),
        serviceCategory: objectIdSchemaOptional,
        discountType: z.enum([...Object.values(COUPON_DISCOUNT_TYPE)] as [string, ...string[]]).optional(),
        discountValue: z.number().optional(),
        maxDiscountAmount: z.number().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        minOrderAmount: z.number().optional(),
        name: z.string().optional(),
        description: z.string().optional(),
        usageLimit: z.number().optional(),
        userUsageLimitPerUser: z.number().optional(),
        applicableServices: z.array(objectIdSchemaOptional).optional(),
        applicableServiceCategories: z.array(objectIdSchemaOptional).optional(),
    })
});
const getCouponByCodeValidationSchema = z.object({
    body: z.object({
        orderAmount: z.number(),
        service: objectIdSchemaOptional,
    })
})

export const createCouponValidation = {
    createCouponValidationSchema: createCouponSchema,
    updateCouponValidationSchema: updateCouponSchema,
    getCouponByCodeValidationSchema: getCouponByCodeValidationSchema,
}
