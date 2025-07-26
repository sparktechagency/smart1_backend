import { Document, Types } from 'mongoose';
import { IGeoLocation } from '../user/user.interface';
import { BOOKING_STATUS, CANCELL_OR_REFUND_REASON, PAYMENT_METHOD, PAYMENT_STATUS } from './booking.enums';
import { USER_ROLES } from '../user/user.enums';

export interface IBookingService {
     service: Types.ObjectId;
     quantity: number;
}

export interface IBooking extends Document {
     _id: Types.ObjectId;
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
     images: string[];
     bookingDate: Date;
     bookingTime: Date;
     serviceProvider?: Types.ObjectId | null; // এটা শুরু তে null থাকবে আর যখন user কারো bid accept করবে তখন সেই bidder এর id এখানে save হবে
     serviceTaskDetails: string;
     serviceTaskAdditionalInfo: string;
     bookingCancelReason?: CANCELL_OR_REFUND_REASON | null;
     servicingDestination: string;
     acceptedBid: Types.ObjectId | null;
     isDeleted: boolean;
     paymentMethod: PAYMENT_METHOD;
     paymentStatus: PAYMENT_STATUS;
     cancelledBy: {
          role: USER_ROLES;
          id: Types.ObjectId;
     }
     createdAt?: Date;
     updatedAt?: Date;
     deletedAt?: Date;
     payment?: Types.ObjectId;
     adminRevenuePercent: number;
}
