import { Types } from "mongoose";
import { BID_STATUS } from "./Bid.enum";

export interface IBid {
     serviceProvider: Types.ObjectId;
     revenue: number;
     rate: number;
     booking?: Types.ObjectId;
     status: BID_STATUS;
     bidCancelReason?: string;
     isAccepted: boolean;
     serviceCategory: Types.ObjectId;
     review: Types.ObjectId[];
     createdAt: Date;
     updatedAt: Date;
     isDeleted: boolean;
     deletedAt?: Date;
}

export type IBidFilters = {
     searchTerm?: string;
};
