import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';
import AppError from '../../../errors/AppError';
import QueryBuilder from '../../builder/QueryBuilder';
import { IJwtPayload } from '../auth/auth.interface';
import { BOOKING_STATUS, PAYMENT_METHOD, PAYMENT_STATUS } from '../booking/booking.enums';
import { Booking } from '../booking/booking.model';
import { transferToServiceProvider } from '../booking/booking.utils';
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
     const isExistBooking = await Booking.findOne({ _id: payload.booking, serviceCategory: { $in: serviceProvider.serviceCategories } });
     if (!isExistBooking) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Booking not found.');
     }

     const result = await Bid.create({ ...payload, serviceProvider: user.id, serviceCategory: isExistBooking.serviceCategory });
     if (!result) {
          throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to create bid.');
     }

     //@ts-ignore
     const io = global.io;
     if (io) {
          io.emit(`getBid::${payload?.booking}`, result);
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
     const isExist = await Bid.findOne({ _id: id, status: BID_STATUS.PENDING });
     if (!isExist) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Bid not found or not in pending status. Only pending bids can be updated.');
     }
     return await Bid.findByIdAndUpdate(id, { rate: payload.rate }, { new: true });
};

const deleteBid = async (id: string): Promise<IBid | null> => {
     const bid = await Bid.findOne({ _id: id, status: BID_STATUS.PENDING });
     if (!bid) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Bid not found or not in pending status. Only pending bids can be deleted.');
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
     const bid = await Bid.findOneAndDelete({ _id: id, status: BID_STATUS.PENDING });
     if (!bid) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Bid not found or not in pending status. Only pending bids can be deleted.');
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

const changeBidStatus = async (bidId: string, status: BID_STATUS | any, user: IJwtPayload) => {
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

          const booking = await Booking.findOne({ _id: thisBid.booking }).populate('serviceProvider', 'adminRevenuePercent stripeConnectedAccount').session(session);
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
                                                  adminRevenuePercent: (booking!.serviceProvider as any).adminRevenuePercent,
                                                  serviceProvider: (booking!.serviceProvider as any)._id.toString(),
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

          // // Update booking status
          // const updatedBooking = await Booking.findOneAndUpdate(
          //      { _id: new Types.ObjectId(bidId), acceptedBid: booking!._id },
          //      { status },
          //      { new: true, session }
          // );
          thisBid.status = status;
          const updatedBid = await thisBid.save();

          // // Update bid status
          // const updatedBid = await Bid.findOneAndUpdate(
          //      { _id: booking!._id },
          //      { status },
          //      { new: true, session }
          // );
          booking.status = status as BOOKING_STATUS;
          const updatedBooking = await booking.save();

          if (!updatedBooking || !updatedBid) {
               throw new AppError(StatusCodes.BAD_REQUEST, 'Failed to update booking or bid');
          }

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
     getAllBidsByBookingId,
};
