import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';
import config from '../../../config';
import AppError from '../../../errors/AppError';
import QueryBuilder from '../../builder/QueryBuilder';
import stripe from '../../config/stripe.config';
import { IJwtPayload } from '../auth/auth.interface';
import { CANCELL_OR_REFUND_REASON, PAYMENT_METHOD, PAYMENT_STATUS } from '../booking/booking.enums';
import { Booking } from '../booking/booking.model';
import { USER_ROLES } from '../user/user.enums';
import { User } from '../user/user.model';
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


const stripeDuePaymentIntentById = async (paymentId: string, user: IJwtPayload) => {
     const session = await mongoose.startSession();
     session.startTransaction();
     try {
          const thisUser = await User.findOne({ email: user.email }).session(session);
          if (!thisUser) {
               throw new AppError(StatusCodes.NOT_FOUND, 'User not found!');
          }
          const payment = await Payment.findOne({ _id: paymentId as string, paymentMethod: PAYMENT_METHOD.ONLINE, status: PAYMENT_STATUS.UNPAID, user: thisUser._id }).session(session);
          if (!payment) {
               throw new AppError(StatusCodes.NOT_FOUND, 'Payment not found! Payment is not UNPAID or not Online Payment or invalid id!');
          }
          console.log({ payment });
          // handle is exist booking
          const booking = await Booking.findOne({ _id: payment.booking }).session(session);
          if (!booking) {
               throw new AppError(StatusCodes.NOT_FOUND, 'Booking not found!');
          }

          // stripe customer create
          const stripeCustomer = await stripe.customers.create({
               email: thisUser!.email,
               name: `${thisUser?.full_name}`,
          });
          if (!stripeCustomer) {
               throw new AppError(StatusCodes.BAD_REQUEST, 'Failed to create Stripe customer.');
          }

          thisUser.stripeCustomerId = stripeCustomer?.id;
          console.log(
               '🚀 ~ createBookingToDB ~ New customer created:',
               stripeCustomer
          );
          await thisUser.save({ session });

          const admins = await User.find({ role: { $in: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN] } }).session(session);
          const notificationReceivers = [...admins.map((u: any) => u._id.toString()), thisUser._id.toString(), booking.serviceProvider?.toString()];

          const stripeSessionData: any = {
               mode: 'payment',
               customer: stripeCustomer?.id,
               line_items: [
                    {
                         price_data: {
                              currency: 'ngn',
                              product_data: {
                                   name: 'Amount',
                              },
                              unit_amount: Math.round(payment.amount * 100),
                         },
                         quantity: 1,
                    },
               ],
               metadata: {
                    acceptedBid: booking.acceptedBid,
                    user: thisUser._id,
                    booking: booking._id,
                    serviceCategory: booking.serviceCategory,
                    method: payment.method,
                    amount: payment.amount,
                    notificationReceivers: JSON.stringify(notificationReceivers),
                    previouslyAcceptedBidProvider: '',
                    isAcceptedBidChanged: false,
               },
               success_url: config.stripe.success_url,
               cancel_url: config.stripe.cancel_url,
          }
          const stripeSession: any = await stripe.checkout.sessions.create(stripeSessionData);
          console.log('🚀 ~ createBookingToDB ~:', {
               url: stripeSession.url,
          });

          await session.commitTransaction();
          session.endSession();
          return {
               url: stripeSession.url,
          };
     } catch (error) {
          await session.abortTransaction();
          session.endSession();
          throw error;
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
     refundPayment,
     stripeDuePaymentIntentById
};
