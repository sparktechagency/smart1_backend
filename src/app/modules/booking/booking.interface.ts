import { Document, Types } from 'mongoose';
import { IGeoLocation } from '../user/user.interface';
import { BOOKING_STATUS, PAYMENT_METHOD, PAYMENT_STATUS } from './booking.enums';

export interface IBookingService {
     service: Types.ObjectId;
     quantity: number;
     serviceCharge: number;
}

export interface IBooking extends Document {
     user: Types.ObjectId;
     serviceCategory: Types.ObjectId;
     services: IBookingService[];
     coupon: Types.ObjectId | null;
     totalAmount: number;
     discount: number;
     finalAmount: number;
     isPaymentTransferd: boolean;
     status: BOOKING_STATUS;
     geoLocationOfDestination: IGeoLocation;
     attachmentImages: string[];
     bookingDate: Date;
     bookingTime: Date;
     serviceProvider?: Types.ObjectId | null; // এটা শুরু তে null থাকবে আর যখন user কারো bid accept করবে তখন সেই bidder এর id এখানে save হবে
     serviceTaskDetails: string;
     serviceTaskAdditionalInfo: string;
     bookingCancelReason: string | null
     servicingDestination: string;
     acceptedBid: Types.ObjectId | null;
     isDeleted: boolean
     paymentMethod: PAYMENT_METHOD;
     paymentStatus: PAYMENT_STATUS;
     createdAt?: Date;
     updatedAt?: Date;
     deletedAt?: Date;
     payment?: Types.ObjectId;
     isNeedRefund: boolean;
}
