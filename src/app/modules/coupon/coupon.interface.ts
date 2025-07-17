import mongoose from "mongoose";
import { COUPON_DISCOUNT_TYPE } from "./coupon.enums";

export interface ICoupon extends Document {
  code: string;
  serviceCategory: mongoose.Types.ObjectId;
  discountType: COUPON_DISCOUNT_TYPE;
  discountValue: number;
  maxDiscountAmount?: number;
  startDate: Date;
  endDate: Date;
  minOrderAmount?: number;
  isActive: boolean;
  isDeleted: boolean;
  createdBy: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  usageLimit?: number;
  usedCount: number;
  userUsageLimitPerUser?: number;
  couponUsedCountByUser: { user: { type: mongoose.Types.ObjectId, ref: 'User' }, count: number }[];
  applicableServices?: mongoose.Types.ObjectId[];
  applicableServiceCategories?: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date;
}