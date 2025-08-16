import { Types } from 'mongoose';
import { CANCELL_OR_REFUND_REASON, TRACK_BOOKING_STATUS } from '../booking/booking.enums';
import { BID_STATUS } from './Bid.enum';

export interface IBid {
     serviceProvider: Types.ObjectId | null;
     rate: number;
     booking: Types.ObjectId;
     status: BID_STATUS;
     statusChangeTimes: {
          [key in TRACK_BOOKING_STATUS]: Date;
     };
     bidCancelReason?: CANCELL_OR_REFUND_REASON;
     isAccepted: boolean;
     serviceCategory: Types.ObjectId | null;
     review: Types.ObjectId[];
     createdAt: Date;
     updatedAt: Date;
     isDeleted: boolean;
     deletedAt?: Date;
     distanceToDestination: number;
}

export type IBidFilters = {
     searchTerm?: string;
};
