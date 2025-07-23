import { StatusCodes } from 'http-status-codes';
import AppError from '../../../errors/AppError';
import QueryBuilder from '../../builder/QueryBuilder';
import stripe from '../../config/stripe.config';
import { IJwtPayload } from '../auth/auth.interface';
import { CANCELL_OR_REFUND_REASON, PAYMENT_METHOD, PAYMENT_STATUS } from '../booking/booking.enums';
import { IPayment } from './Payment.interface';
import { Payment } from './Payment.model';

const createPayment = async (payload: Partial<IPayment>): Promise<IPayment> => {
     const result = await Payment.create(payload);
     return result;
};

const getAllPayments = async (query: Record<string, any>): Promise<{ meta: { total: number; page: number; limit: number; }; result: IPayment[]; }> => {
     const queryBuilder = new QueryBuilder(Payment.find(), query);
     const result = await queryBuilder.filter().sort().paginate().fields().modelQuery;
     const meta = await queryBuilder.countTotal();
     return { meta, result };
};

const getAllUnpaginatedPayments = async (): Promise<IPayment[]> => {
     const result = await Payment.find();
     return result;
};

const updatePayment = async (id: string, payload: Partial<IPayment>): Promise<IPayment | null> => {
     const isExist = await Payment.findById(id);
     if (!isExist) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Payment not found.');
     }

     return await Payment.findByIdAndUpdate(id, payload, { new: true });
};

const deletePayment = async (id: string): Promise<IPayment | null> => {
     const result = await Payment.findById(id);
     if (!result) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Payment not found.');
     }
     result.isDeleted = true;
     result.deletedAt = new Date();
     await result.save();
     return result;
};

const hardDeletePayment = async (id: string): Promise<IPayment | null> => {
     const result = await Payment.findByIdAndDelete(id);
     if (!result) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Payment not found.');
     }
     return result;
};

const getPaymentById = async (id: string): Promise<IPayment | null> => {
     const result = await Payment.findById(id);
     if (!result) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Payment not found.');
     }
     return result;
};

const isPaymentExist = async (paymentIntent: string) => {
     const result = await Payment.findOne({ paymentIntent: paymentIntent });
     return result;
};


const refundPayment = async (paymentId: string, user: IJwtPayload, refundReason: CANCELL_OR_REFUND_REASON) => {
     try {
          const payment = await Payment.findOne({ _id: paymentId, user: user.id, status: { $nin: [PAYMENT_STATUS.UNPAID, PAYMENT_STATUS.REFUNDED] } }).populate('booking');
          if (!payment) {
               throw new AppError(StatusCodes.BAD_REQUEST, 'Payment for this order is not successful or not found.');
          }
          // Check if the order payment is completed
          if (payment.method === PAYMENT_METHOD.ONLINE) {
               // Refund logic with Stripe
               const adminShare = payment.amount * ((payment.booking as any)?.adminRevenuePercent / 100);
               const refundAmount = Math.round((payment.amount - adminShare) * 100); // Convert to integer (cents)
               // Refund logic with Stripe
               const refund = await stripe.refunds.create({
                    payment_intent: payment.paymentIntent, // Use the saved paymentIntent
                    amount: refundAmount, // Refund the full amount (you can modify this if partial refund is needed)
               });
               console.log('refund', refund);
          }
          payment.status = PAYMENT_STATUS.REFUNDED;
          payment.isNeedRefund = false;
          payment.refundReason = refundReason;
          await payment.save();

          // Respond with success message and refund details
          return payment;
     } catch (error) {
          console.error('Error processing refund:', error);
          throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error processing refund.');
     }
};

export const PaymentService = {
     createPayment,
     getAllPayments,
     getAllUnpaginatedPayments,
     updatePayment,
     deletePayment,
     hardDeletePayment,
     getPaymentById,
     isPaymentExist,
     refundPayment
};
