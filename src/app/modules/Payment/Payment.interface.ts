import { Types } from "mongoose";
import { PAYMENT_METHOD, PAYMENT_STATUS } from "../booking/booking.enums";

export interface IPayment {
     user: Types.ObjectId | null;
     booking: Types.ObjectId | null;
     serviceCategory: Types.ObjectId | null;
     method: PAYMENT_METHOD;
     status: PAYMENT_STATUS;
     transactionId: string;
     paymentIntent?: string;
     amount: number;
     gatewayResponse?: Record<string, any>;
     createdAt: Date;
     updatedAt: Date;
     isDeleted: boolean;
     deletedAt?: Date;
     deletedBy?: Types.ObjectId | null;
}

export type IPaymentFilters = {
     searchTerm?: string;
};
