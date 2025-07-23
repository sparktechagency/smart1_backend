import { StatusCodes } from 'http-status-codes';
import AppError from '../../../errors/AppError';
import QueryBuilder from '../../builder/QueryBuilder';
import { IJwtPayload } from '../auth/auth.interface';
import { BOOKING_STATUS, CANCELL_OR_REFUND_REASON, PAYMENT_METHOD, PAYMENT_STATUS } from '../booking/booking.enums';
import { Booking } from '../booking/booking.model';
import { transferToServiceProvider } from '../booking/booking.utils';
import { PaymentService } from '../Payment/Payment.service';
import { USER_ROLES } from '../user/user.enums';
import { User } from '../user/user.model';
import { BID_STATUS } from './Bid.enum';
import { IBid } from './Bid.interface';
import { Bid } from './Bid.model';

const createBid = async (payload: IBid, user: IJwtPayload): Promise<IBid> => {
     // is already user has a bid for this booking
     const existingBidByUser = await Bid.findOne({ serviceProvider: user.id, booking: payload.booking, isDeleted: false });
     if (existingBidByUser) {
          throw new AppError(StatusCodes.CONFLICT, 'You have already placed a bid for this booking.');
     }
     // get serviceProvider
     const serviceProvider = await User.findById(user.id).select('serviceCategory').lean();
     if (!serviceProvider) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Service provider not found.');
     }
     if (payload.booking) {
          // is exist booking or not
          const isExistBooking = await Booking.findOne({ _id: payload.booking, serviceCategory: serviceProvider.serviceCategory });
          if (!isExistBooking) {
               throw new AppError(StatusCodes.NOT_FOUND, 'Booking not found.');
          }
     }

     const result = await Bid.create({ ...payload, serviceProvider: user.id, serviceCategory: serviceProvider.serviceCategory });
     if (!result) {
          throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to create bid.');
     }
     return result;
};

const getAllBids = async (query: Record<string, any>): Promise<{ meta: { total: number; page: number; limit: number }; result: IBid[] }> => {
     const queryBuilder = new QueryBuilder(Bid.find(), query);
     const result = await queryBuilder.filter().sort().paginate().fields().modelQuery;
     const meta = await queryBuilder.countTotal();
     return { meta, result };
};

const getAllUnpaginatedBids = async (): Promise<IBid[]> => {
     const result = await Bid.find();
     return result;
};

const updateBid = async (id: string, payload: Partial<IBid>): Promise<IBid | null> => {
     const isExist = await Bid.findById(id);
     if (!isExist) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Bid not found.');
     }
     return await Bid.findByIdAndUpdate(id, payload, { new: true });
};

const deleteBid = async (id: string): Promise<IBid | null> => {
     const result = await Bid.findById(id);
     if (!result) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Bid not found.');
     }
     result.isDeleted = true;
     result.deletedAt = new Date();
     await result.save();
     return result;
};

const hardDeleteBid = async (id: string): Promise<IBid | null> => {
     const result = await Bid.findByIdAndDelete(id);
     if (!result) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Bid not found.');
     }
     return result;
};

const getBidById = async (id: string): Promise<IBid | null> => {
     const result = await Bid.findById(id);
     if (!result) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Bid not found.');
     }
     return result;
};

const getAllBidsByServiceCategoryId = async (serviceCategoryId: string, query: Record<string, any>): Promise<{ meta: { total: number; page: number; limit: number }; result: IBid[] }> => {
     const queryBuilder = new QueryBuilder(Bid.find({ serviceCategory: serviceCategoryId }), query);
     const result = await queryBuilder.filter().sort().paginate().fields().modelQuery;
     // handle !result
     if (result.length <= 0) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Bids not found.');
     }
     const meta = await queryBuilder.countTotal();
     return { meta, result };
};

const changeBidStatus = async (id: string, status: BID_STATUS, user: IJwtPayload): Promise<IBid | null> => {
     const isExistBid = await Bid.findById(id);
     if (!isExistBid) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Bid not found.');
     }
     // is exist booking
     const isExistBooking = await Booking.findById(isExistBid.booking).populate('serviceProvider');
     if (!isExistBooking) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Booking not found.');
     }
     if (user.role === USER_ROLES.SERVICE_PROVIDER) {
          if (isExistBid.serviceProvider?.toString() !== user.id) {
               throw new AppError(StatusCodes.UNAUTHORIZED, 'You are not authorized to change the status of this bid.');
          }
     }
     // isExistBid status completed or cancelled or rejected
     if (isExistBid.status === BID_STATUS.COMPLETED || isExistBid.status === BID_STATUS.CANCELLED || isExistBid.status === BID_STATUS.REJECTED) {
          throw new AppError(StatusCodes.BAD_REQUEST, 'Bid already completed or cancelled or rejected.');
     }

     switch (isExistBid.status) {
          case BID_STATUS.PENDING:
               if (status === BID_STATUS.ACCEPTED) {
                    isExistBid.isAccepted = true;
                    isExistBid.status = BID_STATUS.ACCEPTED;

                    isExistBooking.status = BOOKING_STATUS.CONFIRMED;
                    isExistBooking.acceptedBid = isExistBid._id;
                    isExistBooking.serviceProvider = isExistBid.serviceProvider;
                    isExistBooking.adminRevenuePercent = (isExistBid.serviceProvider as any)?.adminRevenuePercent;
                    break;
               }
               throw new AppError(StatusCodes.BAD_REQUEST, 'Pending Bid needs to be accepted first.');
          case BID_STATUS.ACCEPTED:
               if (status === BID_STATUS.ON_THE_WAY) {
                    isExistBid.status = BID_STATUS.ON_THE_WAY;
                    isExistBooking.status = BOOKING_STATUS.ON_THE_WAY;
                    break;
               }
               throw new AppError(StatusCodes.BAD_REQUEST, 'Accepted Bid needs to be on the way first.');
          case BID_STATUS.ON_THE_WAY:
               if (status === BID_STATUS.WORK_STARTED) {
                    isExistBid.status = BID_STATUS.WORK_STARTED;
                    isExistBooking.status = BOOKING_STATUS.WORK_STARTED;
                    break;
               }
               throw new AppError(StatusCodes.BAD_REQUEST, 'Bid needs to be work started first.');
          case BID_STATUS.WORK_STARTED:
               if (status === BID_STATUS.COMPLETED) {
                    // transfer amount to serviceProvider
                    if (isExistBooking.paymentStatus === PAYMENT_STATUS.PAID) {
                         if (isExistBooking.paymentMethod === PAYMENT_METHOD.ONLINE && isExistBooking.isPaymentTransferd === false) {
                              if ((isExistBid.serviceProvider as any).stripeConnectedAccount) {
                                   const transfer = await transferToServiceProvider({
                                        stripeConnectedAccount: (isExistBid.serviceProvider as any).stripeConnectedAccount,
                                        finalAmount: isExistBooking.finalAmount,
                                        revenue: (isExistBid.serviceProvider as any).adminRevenuePercent,
                                        bookingId: (isExistBooking._id as string).toString(),
                                   });
                                   console.log('🚀 ~ changeBookingStatus ~ transfer:', transfer);
                              } else {
                                   throw new AppError(StatusCodes.BAD_REQUEST, 'Stripe account not found');
                              }
                         } else if (isExistBooking.paymentMethod === PAYMENT_METHOD.CASH) {
                              throw new AppError(StatusCodes.BAD_REQUEST, 'Payment method is cash. So you have to pay first');
                         }
                    }
                    isExistBid.status = BID_STATUS.COMPLETED;
                    // * payment and booking stutus will be completed too in webhook
                    break;
               }
               throw new AppError(StatusCodes.BAD_REQUEST, 'Bid needs to be completed first.');
          default:
               throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid bid status');
     }
     await isExistBid.save();
     await isExistBooking.save();
     return isExistBid;
}; // ***

const cancelBid = async (id: string, reason: CANCELL_OR_REFUND_REASON, user: IJwtPayload): Promise<IBid | null> => {
     const isExistBid = await Bid.findById(id);
     if (!isExistBid) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Bid not found.');
     }

     // Check if bid is already cancelled or completed
     if (isExistBid.status === BID_STATUS.CANCELLED || isExistBid.status === BID_STATUS.COMPLETED) {
          throw new AppError(StatusCodes.BAD_REQUEST, 'Bid is already cancelled or completed.');
     }

     // Authorization check for service provider
     if (user.role === USER_ROLES.SERVICE_PROVIDER) {
          if (isExistBid.serviceProvider?.toString() !== user.id) {
               throw new AppError(StatusCodes.UNAUTHORIZED, 'You are not authorized to cancel this bid.');
          }
     }

     // Get associated booking if exists
     const isExistBooking = await Booking.findById(isExistBid.booking);
     if (isExistBooking) {
          // If this is the accepted bid, we need to handle booking status
          if (isExistBooking.acceptedBid?.toString() === isExistBid._id?.toString()) {
               // Check if booking can be cancelled
               if (isExistBooking.status === BOOKING_STATUS.COMPLETED || isExistBooking.status === BOOKING_STATUS.CANCELLED) {
                    throw new AppError(StatusCodes.BAD_REQUEST, 'Cannot cancel bid for completed or cancelled booking.');
               }

               // If payment is made and booking is in progress, handle refund logic
               if (isExistBooking.paymentStatus === PAYMENT_STATUS.PAID) {
                    if (isExistBooking.paymentMethod === PAYMENT_METHOD.ONLINE) {
                         if (isExistBooking.isPaymentTransferd === true) {
                              // need to refund to serviceProvider
                              const refundedPayment = await PaymentService.refundPayment(isExistBooking.payment?.toString() as string, user, reason);
                              if (!refundedPayment) {
                                   throw new AppError(StatusCodes.BAD_REQUEST, 'Failed to refund payment');
                              }
                              console.log('🚀 ~ cancelBid ~ refundedPayment:', refundedPayment);
                              isExistBooking.isPaymentTransferd = false;
                              isExistBooking.paymentStatus = PAYMENT_STATUS.REFUNDED;
                         }
                    } else if (isExistBooking.paymentMethod === PAYMENT_METHOD.CASH) {
                         isExistBooking.isNeedRefund = true;
                         isExistBooking.paymentStatus = PAYMENT_STATUS.REFUNDED;
                    }
               } else if (isExistBooking.paymentStatus === PAYMENT_STATUS.UNPAID) {
                    // If payment not made, simply cancel the booking
                    isExistBooking.isNeedRefund = false;
               }
          } else {
               throw new AppError(StatusCodes.BAD_REQUEST, 'No bid accepted yet for this booking');
          }

          // Set booking to cancelled and mark for refund
          isExistBooking.status = BOOKING_STATUS.CANCELLED;
          isExistBooking.bookingCancelReason = reason;
          await isExistBooking.save();
     }

     // Cancel the bid
     isExistBid.status = BID_STATUS.CANCELLED;
     isExistBid.bidCancelReason = reason;
     await isExistBid.save();

     return isExistBid;
};

export const BidService = {
     createBid,
     getAllBids,
     getAllUnpaginatedBids,
     updateBid,
     deleteBid,
     hardDeleteBid,
     getBidById,
     getAllBidsByServiceCategoryId,
     changeBidStatus,
     cancelBid,
};
