import { StatusCodes } from 'http-status-codes';
import AppError from '../../../errors/AppError';
import QueryBuilder from '../../builder/QueryBuilder';
import { IJwtPayload } from '../auth/auth.interface';
import { BOOKING_STATUS, PAYMENT_METHOD, PAYMENT_STATUS } from '../booking/booking.enums';
import { Booking } from '../booking/booking.model';
import { transferToServiceProvider } from '../booking/booking.utils';
import { USER_ROLES } from '../user/user.enums';
import { User } from '../user/user.model';
import { BID_STATUS } from './Bid.enum';
import { IBid } from './Bid.interface';
import { Bid } from './Bid.model';
import mongoose, { Types } from 'mongoose';

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

const updateBidRate = async (id: string, payload: { rate: number }): Promise<IBid | null> => {
     const isExist = await Bid.findById(id);
     if (!isExist) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Bid not found.');
     }
     return await Bid.findByIdAndUpdate(id, { rate: payload.rate }, { new: true });
};

const deleteBid = async (id: string): Promise<IBid | null> => {
     const bid = await Bid.findById(id);
     if (!bid) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Bid not found.');
     }
     if (bid.status !== BID_STATUS.PENDING) {
          throw new AppError(StatusCodes.BAD_REQUEST, 'Bid status is not pending. Bid can only be deleted if it is pending.');
     }
     bid.isDeleted = true;
     bid.deletedAt = new Date();
     await bid.save();
     return bid;
};

const hardDeleteBid = async (id: string): Promise<IBid | null> => {
     const bid = await Bid.findByIdAndDelete(id);
     if (!bid) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Bid not found.');
     }
     if (bid.status !== BID_STATUS.PENDING) {
          throw new AppError(StatusCodes.BAD_REQUEST, 'Bid status is not pending. Bid can only be deleted if it is pending.');
     }
     return bid;
};

const getBidById = async (id: string): Promise<IBid | null> => {
     const result = await Bid.findById(id);
     if (!result) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Bid not found.');
     }
     return result;
};



// const changeBidStatus = async (id: string, status: BID_STATUS, user: IJwtPayload): Promise<IBid | null> => {
//      const isExistBid = await Bid.findById(id);
//      if (!isExistBid) {
//           throw new AppError(StatusCodes.NOT_FOUND, 'Bid not found.');
//      }
//      // is exist booking
//      const isExistBooking = await Booking.findById(isExistBid.booking).populate('serviceProvider');
//      if (!isExistBooking) {
//           throw new AppError(StatusCodes.NOT_FOUND, 'Booking not found.');
//      }
//      if (user.role === USER_ROLES.SERVICE_PROVIDER) {
//           if (isExistBid.serviceProvider?.toString() !== user.id) {
//                throw new AppError(StatusCodes.UNAUTHORIZED, 'You are not authorized to change the status of this bid.');
//           }
//      }
//      // isExistBid status completed or cancelled or rejected
//      if (isExistBid.status === BID_STATUS.COMPLETED || isExistBid.status === BID_STATUS.CANCELLED || isExistBid.status === BID_STATUS.REJECTED) {
//           throw new AppError(StatusCodes.BAD_REQUEST, 'Bid already completed or cancelled or rejected.');
//      }

//      switch (isExistBid.status) {
//           case BID_STATUS.PENDING:
//                if (status === BID_STATUS.ACCEPTED) {
//                     isExistBid.isAccepted = true;
//                     isExistBid.status = BID_STATUS.ACCEPTED;

//                     isExistBooking.status = BOOKING_STATUS.CONFIRMED;
//                     isExistBooking.acceptedBid = isExistBid._id;
//                     isExistBooking.serviceProvider = isExistBid.serviceProvider;
//                     isExistBooking.adminRevenuePercent = (isExistBid.serviceProvider as any)?.adminRevenuePercent;
//                     break;
//                }
//                throw new AppError(StatusCodes.BAD_REQUEST, 'Pending Bid needs to be accepted first.');
//           case BID_STATUS.ACCEPTED:
//                if (status === BID_STATUS.ON_THE_WAY) {
//                     isExistBid.status = BID_STATUS.ON_THE_WAY;
//                     isExistBooking.status = BOOKING_STATUS.ON_THE_WAY;
//                     break;
//                }
//                throw new AppError(StatusCodes.BAD_REQUEST, 'Accepted Bid needs to be on the way first.');
//           case BID_STATUS.ON_THE_WAY:
//                if (status === BID_STATUS.WORK_STARTED) {
//                     isExistBid.status = BID_STATUS.WORK_STARTED;
//                     isExistBooking.status = BOOKING_STATUS.WORK_STARTED;
//                     break;
//                }
//                throw new AppError(StatusCodes.BAD_REQUEST, 'Bid needs to be work started first.');
//           case BID_STATUS.WORK_STARTED:
//                if (status === BID_STATUS.COMPLETED) {
//                     // transfer amount to serviceProvider
//                     if (isExistBooking.paymentStatus === PAYMENT_STATUS.PAID) {
//                          if (isExistBooking.paymentMethod === PAYMENT_METHOD.ONLINE && isExistBooking.isPaymentTransferd === false) {
//                               if ((isExistBid.serviceProvider as any).stripeConnectedAccount) {
//                                    const transfer = await transferToServiceProvider({
//                                         stripeConnectedAccount: (isExistBid.serviceProvider as any).stripeConnectedAccount,
//                                         finalAmount: isExistBooking.finalAmount,
//                                         revenue: (isExistBid.serviceProvider as any).adminRevenuePercent,
//                                         bookingId: isExistBooking._id as unknown as string,
//                                    });
//                                    console.log('🚀 ~ changeBookingStatus ~ transfer:', transfer);
//                               } else {
//                                    throw new AppError(StatusCodes.BAD_REQUEST, 'Stripe account not found');
//                               }
//                          } else if (isExistBooking.paymentMethod === PAYMENT_METHOD.CASH) {
//                               throw new AppError(StatusCodes.BAD_REQUEST, 'Payment method is cash. So you have to pay first');
//                          }
//                     }
//                     isExistBid.status = BID_STATUS.COMPLETED;
//                     // * payment and booking stutus will be completed too in webhook
//                     break;
//                }
//                throw new AppError(StatusCodes.BAD_REQUEST, 'Bid needs to be completed first.');
//           default:
//                throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid bid status');
//      }
//      await isExistBid.save();
//      await isExistBooking.save();
//      return isExistBid;
// }; // ***

const changeBidStatus = async (bidId: string, status: string, user: IJwtPayload) => {
     const session = await mongoose.startSession();
     session.startTransaction(); // Start the transaction

     try {
          // if status to be cancelled then throws error mentioning the cancel route
          if (status === BID_STATUS.CANCELLED) {
               throw new AppError(StatusCodes.BAD_REQUEST, 'Use method: Delete and route: /api/v1/booking/cancel/:id to cancel a booking');
          }

          // Find bid
          const thisBid = await Bid.findById(bidId).session(session); // Attach the session to the query
          if (!thisBid || thisBid.serviceProvider?.toString() !== user.id) {
               throw new AppError(StatusCodes.NOT_FOUND, 'bid not Found');
          }

          const booking = await Booking.findOne({ _id: thisBid.booking }).populate('serviceProvider').session(session);
          if (!booking) {
               throw new AppError(StatusCodes.NOT_FOUND, 'Booking not Found');
          }

          // Status validation for booking
          switch (thisBid.status) {
               case BID_STATUS.PENDING:
                    if (status === BID_STATUS.ACCEPTED) {
                         throw new AppError(StatusCodes.BAD_REQUEST, 'Need to be accepted by the booking owner first');
                    }
                    break;
               case BID_STATUS.ACCEPTED:
                    if (status === BID_STATUS.ON_THE_WAY) {
                         break;
                    }
                    throw new AppError(StatusCodes.BAD_REQUEST, `Accepted Booking can't be updated to ${status} can only be updated to "on The Way"`);
               case BID_STATUS.ON_THE_WAY:
                    if (status === BID_STATUS.WORK_STARTED) {
                         break;
                    }
                    throw new AppError(StatusCodes.BAD_REQUEST, `"On The Way" Booking can't be updated to ${status} can only be updated to "work started"`);
               case BID_STATUS.WORK_STARTED:
                    if (status === BID_STATUS.COMPLETED) {
                         if (booking!.paymentStatus === PAYMENT_STATUS.PAID) {
                              if (booking!.paymentMethod === PAYMENT_METHOD.ONLINE) {
                                   if (booking!.isPaymentTransferd === false) {
                                        if ((booking!.serviceProvider as any).stripeConnectedAccount) {
                                             const transfer = await transferToServiceProvider({
                                                  stripeConnectedAccount: (booking!.serviceProvider as any).stripeConnectedAccount,
                                                  finalAmount: booking!.finalAmount,
                                                  revenue: (booking!.serviceProvider as any).adminRevenuePercent,
                                                  bookingId: booking!._id.toString(),
                                             });
                                             console.log('🚀 ~ changeBookingStatus ~ transfer:', transfer);
                                        } else {
                                             throw new AppError(StatusCodes.BAD_REQUEST, 'Stripe account not found');
                                        }
                                   }
                              }
                         } else if (booking!.paymentStatus === PAYMENT_STATUS.UNPAID) {
                              throw new AppError(StatusCodes.BAD_REQUEST, `Payment is not done yet. Do the payment first. payment id : ${booking!.payment}`);
                         }
                         break;
                    }
                    throw new AppError(StatusCodes.BAD_REQUEST, `"Work Started" Booking can't be updated to ${status} can only be updated to "completed"`);
               case BID_STATUS.COMPLETED:
                    throw new AppError(StatusCodes.BAD_REQUEST, "COMPLETED Booking can't be updated");
               case BID_STATUS.CANCELLED:
                    throw new AppError(StatusCodes.BAD_REQUEST, "CANCELLED Booking can't be updated");
               default:
                    throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid booking status');
          }

          // Update booking status
          const updatedBooking = await Booking.findOneAndUpdate(
               { _id: new Types.ObjectId(bidId), acceptedBid: booking!._id },
               { status },
               { new: true, session }
          );

          // Update bid status
          const updatedBid = await Bid.findOneAndUpdate(
               { _id: booking!._id },
               { status },
               { new: true, session }
          );

          // Commit the transaction
          await session.commitTransaction();

          return { updatedBooking, updatedBid };

     } catch (error) {
          // Rollback the transaction in case of an error
          await session.abortTransaction();
          throw error; // Re-throw the error to be handled by the caller
     } finally {
          // End the session
          session.endSession();
     }
};



const getAllBidsByBookingId = async (query: Record<string, any>, bookingId: string, user: IJwtPayload) => {
     const booking = await Booking.findOne({ _id: bookingId, user: user.id, status: { $in: [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED] } });
     if (!booking) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Booking not found');
     }
     const queryBuilder = new QueryBuilder(
          Bid.find({ booking: bookingId })
               .populate('serviceProvider', 'full_name _id email phone')
               .populate('serviceCategory', 'name _id')
               .populate('booking', 'servicingDestination geoLocationOfDestination serviceTaskAdditionalInfo serviceTaskDetails bookingTime bookingDate images'),
          query,
     );
     const result = await queryBuilder.modelQuery;
     if (!result || result.length === 0) {
          throw new AppError(StatusCodes.NOT_FOUND, 'No bids found for this booking');
     }
     const meta = await queryBuilder.countTotal();
     return { meta, result };
};

export const BidService = {
     createBid,
     getAllBids,
     getAllUnpaginatedBids,
     updateBidRate,
     deleteBid,
     hardDeleteBid,
     getBidById,
     changeBidStatus,
     getAllBidsByBookingId
};
