import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';
import config from '../../../config';
import AppError from '../../../errors/AppError';
import QueryBuilder from '../../builder/QueryBuilder';
import stripe from '../../config/stripe.config';
import { IJwtPayload } from '../auth/auth.interface';
import { BOOKING_STATUS, PAYMENT_METHOD, PAYMENT_STATUS } from '../booking/booking.enums';
import { Booking } from '../booking/booking.model';
import { USER_ROLES } from '../user/user.enums';
import { User } from '../user/user.model';
import { BID_STATUS, DEFAULT_CURRENCY } from './Bid.enum';
import { IBid } from './Bid.interface';
import { Bid } from './Bid.model';

//@ts-ignore
const io = global.io;

const createBid = async (payload: IBid, user: IJwtPayload): Promise<IBid> => {
     // is already user has a bid for this booking
     const existingBidByUser = await Bid.findOne({ serviceProvider: user.id, booking: payload.booking, isDeleted: false });
     if (existingBidByUser) {
          throw new AppError(StatusCodes.CONFLICT, 'You have already placed a bid for this booking.');
     }
     // get serviceProvider
     const serviceProvider = await User.findById(user.id).select('serviceCategories').lean();
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

// const changeBidStatus = async (bidId: string, status: BID_STATUS | any, user: IJwtPayload) => {
//      const session = await mongoose.startSession();
//      session.startTransaction(); // Start the transaction

//      try {
//           // if status to be cancelled then throws error mentioning the cancel route
//           if (status === BID_STATUS.CANCELLED) {
//                throw new AppError(StatusCodes.BAD_REQUEST, 'Use method: Delete and route: /api/v1/booking/cancel/:id to cancel a booking');
//           }

//           // Find bid
//           const thisBid = await Bid.findById(bidId).session(session); // Attach the session to the query
//           if (!thisBid || thisBid.serviceProvider?.toString() !== user.id) {
//                throw new AppError(StatusCodes.NOT_FOUND, 'bid not Found');
//           }

//           const booking = await Booking.findOne({ _id: thisBid.booking }).populate('serviceProvider', 'adminRevenuePercent stripeConnectedAccount').session(session);
//           if (!booking) {
//                throw new AppError(StatusCodes.NOT_FOUND, 'Booking not Found');
//           }

//           // Status validation for booking
//           switch (thisBid.status) {
//                case BID_STATUS.PENDING:
//                     if (status === BID_STATUS.ACCEPTED) {
//                          throw new AppError(StatusCodes.BAD_REQUEST, 'Need to be accepted by the booking owner first');
//                     }
//                     break;
//                case BID_STATUS.ACCEPTED:
//                     if (status === BID_STATUS.ON_THE_WAY) {
//                          break;
//                     }
//                     throw new AppError(StatusCodes.BAD_REQUEST, `Accepted Booking can't be updated to ${status} can only be updated to "on The Way"`);
//                case BID_STATUS.ON_THE_WAY:
//                     if (status === BID_STATUS.WORK_STARTED) {
//                          break;
//                     }
//                     throw new AppError(StatusCodes.BAD_REQUEST, `"On The Way" Booking can't be updated to ${status} can only be updated to "work started"`);
//                case BID_STATUS.WORK_STARTED:
//                     if (status === BID_STATUS.COMPLETED) {
//                          if (booking!.paymentStatus === PAYMENT_STATUS.PAID) {
//                               if (booking!.paymentMethod === PAYMENT_METHOD.ONLINE) {
//                                    if (booking!.isPaymentTransferd === false) {
//                                         if ((booking!.serviceProvider as any).stripeConnectedAccount) {
//                                              const transfer = await transferToServiceProvider({
//                                                   stripeConnectedAccount: (booking!.serviceProvider as any).stripeConnectedAccount,
//                                                   finalAmount: booking!.finalAmount,
//                                                   adminRevenuePercent: (booking!.serviceProvider as any).adminRevenuePercent,
//                                                   serviceProvider: (booking!.serviceProvider as any)._id.toString(),
//                                                   bookingId: booking!._id.toString(),
//                                              });
//                                              console.log('🚀 ~ changeBookingStatus ~ transfer:', transfer);
//                                         } else {
//                                              throw new AppError(StatusCodes.BAD_REQUEST, 'Stripe account not found');
//                                         }
//                                    }
//                               } else if (booking!.paymentMethod === PAYMENT_METHOD.CASH) {
//                                    // make adminDueAmount += adminRevenue// get serviceProvider from db
//                                    // calculate admin revenue amount
//                                    const adminRevenueAmount = Math.ceil((booking!.finalAmount * (booking!.serviceProvider as any).adminRevenuePercent) / 100);

//                                    // update adminDueAmount of the service provider
//                                    const isExistServiceProvider = await User.findByIdAndUpdate(
//                                         (booking!.serviceProvider as any)._id.toString(),
//                                         { $inc: { adminDueAmount: adminRevenueAmount } },
//                                         { new: true, session },
//                                    );

//                                    // check if update succeeded
//                                    if (!isExistServiceProvider) {
//                                         throw new AppError(StatusCodes.NOT_FOUND, 'Service provider not found');
//                                    }
//                               }
//                          } else if (booking!.paymentStatus === PAYMENT_STATUS.UNPAID) {
//                               throw new AppError(StatusCodes.BAD_REQUEST, `Payment is not done yet. Do the payment first. payment id : ${booking!.payment}`);
//                          }
//                          break;
//                     }
//                     throw new AppError(StatusCodes.BAD_REQUEST, `"Work Started" Booking can't be updated to ${status} can only be updated to "completed"`);
//                case BID_STATUS.COMPLETED:
//                     throw new AppError(StatusCodes.BAD_REQUEST, "COMPLETED Booking can't be updated");
//                case BID_STATUS.CANCELLED:
//                     throw new AppError(StatusCodes.BAD_REQUEST, "CANCELLED Booking can't be updated");
//                default:
//                     throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid booking status');
//           }

//           // // Update booking status
//           // const updatedBooking = await Booking.findOneAndUpdate(
//           //      { _id: new Types.ObjectId(bidId), acceptedBid: booking!._id },
//           //      { status },
//           //      { new: true, session }
//           // );
//           thisBid.status = status;
//           const updatedBid = await thisBid.save();

//           // // Update bid status
//           // const updatedBid = await Bid.findOneAndUpdate(
//           //      { _id: booking!._id },
//           //      { status },
//           //      { new: true, session }
//           // );
//           booking.status = status as BOOKING_STATUS;
//           const updatedBooking = await booking.save();

//           if (!updatedBooking || !updatedBid) {
//                throw new AppError(StatusCodes.BAD_REQUEST, 'Failed to update booking or bid');
//           }

//           // Commit the transaction
//           await session.commitTransaction();

//           return { updatedBooking, updatedBid };
//      } catch (error) {
//           // Rollback the transaction in case of an error
//           await session.abortTransaction();
//           throw error; // Re-throw the error to be handled by the caller
//      } finally {
//           // End the session
//           session.endSession();
//      }
// };

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
               throw new AppError(StatusCodes.NOT_FOUND, 'Bid not Found');
          }

          const booking = await Booking.findOne({ _id: thisBid.booking }).populate('serviceProvider', 'adminRevenuePercent stripeConnectedAccount').session(session);
          if (!booking) {
               throw new AppError(StatusCodes.NOT_FOUND, 'Booking not Found');
          }

          // Check if user has permission to change the bid status
          const isExistUser = await User.findById(user.id).session(session);
          if (!isExistUser) throw new AppError(StatusCodes.NOT_FOUND, 'User not found');

          // is exist service provider
          const isExistServiceProvider = await User.findById(thisBid.serviceProvider).session(session);
          if (!isExistServiceProvider) throw new AppError(StatusCodes.NOT_FOUND, 'Service provider not found');

          if (user.role === USER_ROLES.SERVICE_PROVIDER && booking.serviceProvider?._id.toString() !== user.id) {
               throw new AppError(StatusCodes.FORBIDDEN, 'You are not authorized to change this bid status');
          } else if (user.role === USER_ROLES.USER && booking.user?.toString() !== user.id) {
               throw new AppError(StatusCodes.FORBIDDEN, 'You are not authorized to change this bid status');
          }

          // Validate the status transition
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
                    throw new AppError(StatusCodes.BAD_REQUEST, `Accepted bid can't be updated to ${status}, it can only be updated to "On The Way"`);
               case BID_STATUS.ON_THE_WAY:
                    if (status === BID_STATUS.WORK_STARTED) {
                         break;
                    }
                    throw new AppError(StatusCodes.BAD_REQUEST, `"On The Way" bid can't be updated to ${status}, it can only be updated to "Work Started"`);
               case BID_STATUS.WORK_STARTED:
                    if (status === BID_STATUS.COMPLETED) {
                         // check if booking verifyCompleteOtp true
                         if (!booking.verifyCompleteOtp) {
                              throw new AppError(StatusCodes.BAD_REQUEST, 'Booking complete OTP not verified');
                         }
                         // ✅ Payment trigger here
                         if (booking.paymentStatus === PAYMENT_STATUS.UNPAID) {
                              if (booking.paymentMethod === PAYMENT_METHOD.ONLINE) {
                                   const thisCustomer = await User.findById(booking.user);
                                   const stripeCustomer = await stripe.customers.create({
                                        name: thisCustomer?.full_name,
                                        email: thisCustomer?.email,
                                   });

                                   await User.findByIdAndUpdate(
                                        thisCustomer?.id,
                                        {
                                             $set: { stripeCustomerId: stripeCustomer.id },
                                        },
                                        { session },
                                   );

                                   const notificationReceivers = [(thisBid.serviceProvider as any)._id.toString()];

                                   const tobePaidAmount = isExistUser.adminDueAmount > 0 ? booking.finalAmount + isExistUser.adminDueAmount : booking.finalAmount;

                                   io.emit(`reminder::${isExistUser?._id}`, `You had ${isExistUser.adminDueAmount} amount due previously so we are including that for payment`);

                                   const stripeSessionData: any = {
                                        payment_method_types: ['card'],
                                        mode: 'payment',
                                        customer: stripeCustomer.id,
                                        line_items: [
                                             {
                                                  price_data: {
                                                       currency: DEFAULT_CURRENCY.SAR || 'sar',
                                                       product_data: { name: 'Booking Payment' },
                                                       unit_amount: tobePaidAmount! * 100, // Stripe expects amount in cents
                                                  },
                                                  quantity: 1,
                                             },
                                        ],
                                        metadata: {
                                             user: booking.user.toString(),
                                             acceptedBid: thisBid!._id.toString(),
                                             booking: booking._id.toString(),
                                             serviceCategory: booking.serviceCategory.toString(),
                                             method: booking.paymentMethod,
                                             amount: booking.finalAmount,
                                             notificationReceivers: JSON.stringify(notificationReceivers),
                                             isAcceptedBidChanged: false,
                                             previouslyAcceptedBidProvider: '',
                                        },
                                        success_url: `${config.stripe.success_url}?bookingId=${booking._id}`,
                                        cancel_url: config.stripe.cancel_url,
                                   };

                                   const stripeSession = await stripe.checkout.sessions.create(stripeSessionData);

                                   await session.commitTransaction();

                                   return { message: 'Redirect to payment', url: stripeSession.url };
                              } else if (booking.paymentMethod === PAYMENT_METHOD.CASH && booking.payment == null && booking.paymentStatus == PAYMENT_STATUS.UNPAID) {
                                   // await session.commitTransaction();
                                   // return { message: 'Service completed. Collect cash from customer.' };
                                   const adminRevenueAmount = Math.ceil((booking!.finalAmount * (booking!.serviceProvider as any).adminRevenuePercent) / 100);
                                   isExistServiceProvider.adminDueAmount += adminRevenueAmount;
                                   await isExistServiceProvider.save();
                                   booking.paymentStatus = PAYMENT_STATUS.PAID;
                              }
                         }
                         break;
                    }
                    throw new AppError(StatusCodes.BAD_REQUEST, `"Work Started" bid can't be updated to ${status}, it can only be updated to "Completed"`);
               case BID_STATUS.COMPLETED:
                    throw new AppError(StatusCodes.BAD_REQUEST, "Completed bid can't be updated");
               case BID_STATUS.CANCELLED:
                    throw new AppError(StatusCodes.BAD_REQUEST, "Cancelled bid can't be updated");
               default:
                    throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid bid status');
          }

          // Update bid status
          thisBid.status = status;
          const updatedBid = await thisBid.save();

          // Update booking status
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
