import { Types } from "mongoose";
import { CANCELL_OR_REFUND_REASON, PAYMENT_METHOD, PAYMENT_STATUS } from "../booking/booking.enums";

export interface IPayment {
     _id?: Types.ObjectId;
     user: Types.ObjectId | null;
     booking: Types.ObjectId | null;
     serviceCategory: Types.ObjectId | null;
     method: PAYMENT_METHOD;
     status: PAYMENT_STATUS;
     refundReason?: CANCELL_OR_REFUND_REASON;
     transactionId: string;
     paymentIntent?: string;
     amount: number;
     gatewayResponse?: Record<string, any>;
     isNeedRefund: boolean;
     createdAt: Date;
     updatedAt: Date;
     isDeleted: boolean;
     deletedAt?: Date;
     deletedBy?: Types.ObjectId | null;
}

export type IPaymentFilters = {
     searchTerm?: string;
};
