import { Types } from "mongoose";
import { BID_STATUS } from "./Bid.enum";
import { CANCELL_OR_REFUND_REASON } from "../booking/booking.enums";

export interface IBid {
     serviceProvider: Types.ObjectId | null;
     rate: number;
     booking?: Types.ObjectId | null;
     status: BID_STATUS;
     bidCancelReason?: CANCELL_OR_REFUND_REASON;
     isAccepted: boolean;
     serviceCategory: Types.ObjectId | null;
     review: Types.ObjectId[];
     createdAt: Date;
     updatedAt: Date;
     isDeleted: boolean;
     deletedAt?: Date;
}

export type IBidFilters = {
     searchTerm?: string;
};
