import { StatusCodes } from 'http-status-codes';
import mongoose, { Types } from 'mongoose';
import config from '../../../config';
import AppError from '../../../errors/AppError';
import { emailHelper } from '../../../helpers/emailHelper';
import { sendNotifications } from '../../../helpers/notificationsHelper';
import { emailTemplate } from '../../../shared/emailTemplate';
import unlinkFile from '../../../shared/unlinkFile';
import { generateBookingInvoicePDF } from '../../../utils/generateOrderInvoicePDF';
import generateOTP from '../../../utils/generateOTP';
import QueryBuilder from '../../builder/QueryBuilder';
import stripe from '../../config/stripe.config';
import { IJwtPayload } from '../auth/auth.interface';
import { BID_STATUS, DEFAULT_CURRENCY } from '../Bid/Bid.enum';
import { Bid } from '../Bid/Bid.model';
import { NOTIFICATION_MODEL_TYPE, NotificationTitle } from '../notification/notification.enum';
import { Payment } from '../Payment/Payment.model';
import { PaymentService } from '../Payment/Payment.service';
import { USER_ROLES } from '../user/user.enums';
import { User } from '../user/user.model';
import {
     BOOKING_STATUS,
     CANCELL_OR_REFUND_REASON,
     DEFAULT_BOOKING_RANGE,
     DUE_AMOUNT_FOR_REMIND,
     MAXIMUM_WEEKLY_CANCEL_LIMIT,
     MINIMUM_ACCEPTABLE_DUE_AMOUNT,
     PAYMENT_METHOD,
     PAYMENT_STATUS,
     RATING_PANALTY,
} from './booking.enums';
import { IBooking } from './booking.interface';
import { Booking } from './booking.model';
import { combineBookingDateTime, cronJobs, generateTransactionId } from './booking.utils';

//@ts-ignore
const io = global.io;

const createBooking = async (bookingData: Partial<IBooking>, user: IJwtPayload) => {
     const session = await mongoose.startSession();
     session.startTransaction();
     try {
          const combinedDateTime = new Date(combineBookingDateTime(bookingData.bookingDate?.toString() as string, bookingData.bookingTime?.toString() as string));
          // ensure booking date and time is not less than current date and time+not as same as previous booking date and time
          if (combinedDateTime < new Date()) {
               throw new AppError(StatusCodes.BAD_REQUEST, 'Booking date and time must be greater than current date and time');
          }
          const thisCustomer = await User.findById(user.id).session(session);
          if (!thisCustomer || !thisCustomer.stripeCustomerId) {
               throw new AppError(StatusCodes.NOT_FOUND, 'User or Stripe Customer ID not found');
          }
          // // re assign booking date and time
          bookingData.bookingDate = combinedDateTime;
          bookingData.bookingTime = combinedDateTime;
          const booking = new Booking({
               ...bookingData,
               user: user.id,
          });

          // Validate the order data
          await booking.validate();

          const createdBooking = await booking.save({ session });
          if (!createdBooking) {
               bookingData.images?.forEach((image) => {
                    unlinkFile(image);
               });
               throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to create booking');
          }
          // get all the admin and super admin
          const admins = await User.find({ role: { $in: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN] } }).session(session);

          let notificationReceivers = admins.map((u: any) => u._id.toString());

          const providersWithinRange = await User.find({
               role: USER_ROLES.SERVICE_PROVIDER,
               serviceCategories: { $in: [createdBooking.serviceCategory] }, // ensures serviceCategory is in the array
               adminDueAmount: { $lte: MINIMUM_ACCEPTABLE_DUE_AMOUNT }, // ensures adminDueAmount is less than or equal to 200
               geoLocation: {
                    $near: {
                         $geometry: {
                              type: 'Point',
                              coordinates: [booking.geoLocationOfDestination.coordinates[0], booking.geoLocationOfDestination.coordinates[1]],
                         },
                         $maxDistance: DEFAULT_BOOKING_RANGE * 1000, // 10km in meters
                    },
               },
          }).session(session);

          notificationReceivers = [...notificationReceivers, ...providersWithinRange.map((provider: any) => provider._id.toString())];
          for (const receiverId of notificationReceivers) {
               await sendNotifications({
                    receiver: receiverId as unknown as Types.ObjectId,
                    type: NOTIFICATION_MODEL_TYPE.BOOKING,
                    title: NotificationTitle.NEW_BOOKING,
                    message: `New order placed by  ${thisCustomer?.full_name}. But pending for accepted bid. booking id : ${createdBooking._id}`,
                    reference: createdBooking._id,
               });
          }

          // any off-platform agreement with the provider is the user’s full responsibility and the app won’t offer any support
          if (createdBooking.paymentMethod === PAYMENT_METHOD.CASH) {
               await sendNotifications({
                    receiver: createdBooking.user,
                    type: NOTIFICATION_MODEL_TYPE.BOOKING,
                    title: NotificationTitle.NEW_BOOKING,
                    message: `Any off-platform agreement with the provider is the user’s full responsibility and the app won’t offer any support`,
                    reference: createdBooking._id,
               });
          }

          // Generate PDF invoice (commented for now)
          // const pdfBuffer = await generateBookingInvoicePDF(createdBooking);
          // const values = { ... };
          // emailHelper.sendEmail({ ... });

          // commit transaction
          await session.commitTransaction();
          return createdBooking;
     } catch (error) {
          console.log(error);
          // Abort the transaction if any error occurs
          await session.abortTransaction();
          throw error;
     } finally {
          session.endSession();
     }
};

const getBookingDetails = async (bookingId: string, user: IJwtPayload) => {
     let booking: IBooking | null = null;

     // Define the common populate structure
     const populateOptions = [
          {
               path: 'user',
               select: 'full_name _id email phone',
          },
          {
               path: 'services.service',
               select: 'serviceCategory image serviceCharge name servedCount',
          },
          {
               path: 'payment',
               select: 'user booking transactionId paymentIntent amount',
          },
          {
               path: 'serviceProvider',
          },
     ];

     if (user.role === USER_ROLES.USER) {
          booking = await Booking.findOne({ _id: bookingId, user: user.id }).populate(populateOptions);
          if (!booking) {
               throw new AppError(StatusCodes.FORBIDDEN, 'You are not allowed to watch this order');
          }
     }

     // for admin and super admin allowing them and service provider to bid
     if (!booking) {
          booking = await Booking.findById(bookingId).populate(populateOptions);
     }
     if (!booking) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Order not Found');
     }
     return booking;
};

const getMyBookings = async (query: Record<string, unknown>, user: IJwtPayload) => {
     let queryOperation: any;
     // Define the common populate structure
     const populateOptions = [
          {
               path: 'user',
               select: 'full_name _id email phone',
          },
          {
               path: 'serviceCategory',
               select: 'name',
          },
          {
               path: 'serviceProvider',
               select: 'full_name businessName image avgRating reviewsCount',
          },
          {
               path: 'services.service',
               select: 'serviceCategory image serviceCharge name servedCount',
          },
          {
               path: 'payment',
               select: 'user booking transactionId paymentIntent amount',
          },
     ];
     if (user.role === USER_ROLES.USER) {
          queryOperation = Booking.find({ user: user.id });
     } else if (user.role === USER_ROLES.SERVICE_PROVIDER) {
          queryOperation = Booking.find({ serviceProvider: user.id });
     }
     const bookingQuery = new QueryBuilder(queryOperation.populate(populateOptions), query).search(['user.name', 'user.email', 'services.service.name']).filter().sort().paginate().fields();

     const result = await bookingQuery.modelQuery;

     if (!result) {
          throw new AppError(StatusCodes.NOT_FOUND, 'No bookings found');
     }

     const meta = await bookingQuery.countTotal();

     return {
          meta,
          result,
     };
};

// const changeBookingStatus = async (bookingId: string, status: string, user: IJwtPayload) => {
//      const session = await mongoose.startSession();
//      session.startTransaction(); // Start the transaction

//      try {
//           // if status to be cancelled then throws error mentioning the cancel route
//           if (status === BOOKING_STATUS.CANCELLED) {
//                throw new AppError(StatusCodes.BAD_REQUEST, 'Use method: Delete and route: /api/v1/booking/cancel/:id to cancel a booking');
//           }

//           // Find order
//           const booking = await Booking.findById(bookingId).session(session); // Attach the session to the query
//           if (!booking) {
//                throw new AppError(StatusCodes.NOT_FOUND, 'Order not Found');
//           }

//           let bid;
//           if (booking.acceptedBid !== null) {
//                bid = await Bid.findOne({ _id: booking.acceptedBid }).populate('serviceProvider').session(session);
//                if (!bid) {
//                     throw new AppError(StatusCodes.NOT_FOUND, 'Bid not Found');
//                }
//           }

//           // Status validation for booking
//           switch (booking.status) {
//                case BOOKING_STATUS.PENDING:
//                     if (status === BOOKING_STATUS.CONFIRMED) {
//                          throw new AppError(StatusCodes.BAD_REQUEST, 'Need to accept a bid before confirming the booking first');
//                     }
//                     break;
//                case BOOKING_STATUS.CONFIRMED:
//                     if (status === BOOKING_STATUS.ON_THE_WAY) {
//                          break;
//                     }
//                     throw new AppError(StatusCodes.BAD_REQUEST, `Confirmed Booking can't be updated to ${status} can only be updated to "on The Way"`);
//                case BOOKING_STATUS.ON_THE_WAY:
//                     if (status === BOOKING_STATUS.WORK_STARTED) {
//                          break;
//                     }
//                     throw new AppError(StatusCodes.BAD_REQUEST, `"On The Way" Booking can't be updated to ${status} can only be updated to "work started"`);
//                case BOOKING_STATUS.WORK_STARTED:
//                     if (status === BOOKING_STATUS.COMPLETED) {
//                          if (booking.paymentStatus === PAYMENT_STATUS.PAID) {
//                               if (booking.paymentMethod === PAYMENT_METHOD.ONLINE) {
//                                    if (booking.isPaymentTransferd === false) {
//                                         if ((bid!.serviceProvider as any).stripeConnectedAccount) {
//                                              const transfer = await transferToServiceProvider({
//                                                   stripeConnectedAccount: (bid!.serviceProvider as any).stripeConnectedAccount,
//                                                   finalAmount: booking.finalAmount,
//                                                   adminRevenuePercent: (bid!.serviceProvider as any).adminRevenuePercent,
//                                                   serviceProvider: (bid!.serviceProvider as any)._id.toString(),
//                                                   bookingId: booking._id.toString(),
//                                              });
//                                              console.log('🚀 ~ changeBookingStatus ~ transfer:', transfer);
//                                         } else {
//                                              throw new AppError(StatusCodes.BAD_REQUEST, 'Stripe account not found');
//                                         }
//                                    }
//                               }
//                          } else if (booking.paymentStatus === PAYMENT_STATUS.UNPAID) {
//                               throw new AppError(StatusCodes.BAD_REQUEST, `Payment is not done yet. Do the payment first. payment id : ${booking.payment}`);
//                          }
//                          break;
//                     }
//                     throw new AppError(StatusCodes.BAD_REQUEST, `"Work Started" Booking can't be updated to ${status} can only be updated to "completed"`);
//                case BOOKING_STATUS.COMPLETED:
//                     throw new AppError(StatusCodes.BAD_REQUEST, "COMPLETED Booking can't be updated");
//                case BOOKING_STATUS.CANCELLED:
//                     throw new AppError(StatusCodes.BAD_REQUEST, "CANCELLED Booking can't be updated");
//                default:
//                     throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid booking status');
//           }

//           // Update booking status
//           const updatedBooking = await Booking.findOneAndUpdate({ _id: new Types.ObjectId(bookingId), acceptedBid: bid!._id }, { status }, { new: true, session });

//           // Update bid status
//           const updatedBid = await Bid.findOneAndUpdate({ _id: bid!._id }, { status }, { new: true, session });

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

const changeBookingStatus = async (bookingId: string, status: string, user: IJwtPayload) => {
     const session = await mongoose.startSession();
     session.startTransaction();

     try {
          if (status === BOOKING_STATUS.CANCELLED) {
               throw new AppError(StatusCodes.BAD_REQUEST, 'Use DELETE /booking/cancel/:id to cancel bookings');
          }

          const booking = await Booking.findById(bookingId).session(session);
          if (!booking) throw new AppError(StatusCodes.NOT_FOUND, 'Booking not found');

          const isExistUser = await User.findById(user.id).session(session);
          if (!isExistUser) throw new AppError(StatusCodes.NOT_FOUND, 'User not found');

          const isExistServiceProvider = await User.findById(booking.serviceProvider?.toString()).session(session);
          if (!isExistServiceProvider) throw new AppError(StatusCodes.NOT_FOUND, 'Service provider not found');

          if (user.role === USER_ROLES.SERVICE_PROVIDER && booking.serviceProvider?.toString() !== user.id) {
               throw new AppError(StatusCodes.FORBIDDEN, 'You are not authorized as service provider to change Booking Status');
          } else if (user.role === USER_ROLES.USER && booking.user?.toString() !== user.id) {
               throw new AppError(StatusCodes.FORBIDDEN, 'You are not authorized as user to change Booking Status');
          }
          let bid = null;
          if (booking.acceptedBid) {
               bid = await Bid.findById(booking.acceptedBid).populate('serviceProvider').session(session);
               if (!bid) throw new AppError(StatusCodes.NOT_FOUND, 'Accepted bid not found');
          }

          switch (booking.status) {
               case BOOKING_STATUS.PENDING:
                    if (status === BOOKING_STATUS.CONFIRMED) {
                         throw new AppError(StatusCodes.BAD_REQUEST, 'Accept a bid before confirming');
                    }
                    break;
               case BOOKING_STATUS.CONFIRMED:
                    if (status !== BOOKING_STATUS.ON_THE_WAY) {
                         throw new AppError(StatusCodes.BAD_REQUEST, 'Can only move to "on the way"');
                    }
                    break;
               case BOOKING_STATUS.ON_THE_WAY:
                    if (status !== BOOKING_STATUS.WORK_STARTED) {
                         throw new AppError(StatusCodes.BAD_REQUEST, 'Can only move to "work started"');
                    }
                    break;
               case BOOKING_STATUS.WORK_STARTED:
                    if (status === BOOKING_STATUS.COMPLETED) {
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

                                   const notificationReceivers = [(bid!.serviceProvider as any)._id.toString()];

                                   const tobePaidAmount = isExistUser.adminDueAmount > 0 ? booking.finalAmount + isExistUser.adminDueAmount : booking.finalAmount;
                                   console.log('🚀 ~ changeBookingStatus ~ tobePaidAmount:', tobePaidAmount);
                                   console.log('🚀 ~ changeBookingStatus ~ booking.finalAmount:', booking.finalAmount);
                                   console.log('🚀 ~ changeBookingStatus ~ isExistUser.adminDueAmount:', isExistUser.adminDueAmount);

                                   if (isExistUser.adminDueAmount > 0) {
                                        global.io.emit(`reminder::${isExistUser?._id}`, `You had ${isExistUser.adminDueAmount} amount due previously so we are including that for payment`);
                                   }

                                   const stripeSessionData: any = {
                                        payment_method_types: ['card'],
                                        mode: 'payment',
                                        customer: stripeCustomer.id,
                                        line_items: [
                                             {
                                                  price_data: {
                                                       currency: DEFAULT_CURRENCY.SAR || 'sar',
                                                       product_data: { name: 'Booking Payment' },
                                                       unit_amount: tobePaidAmount! * 100,
                                                  },
                                                  quantity: 1,
                                             },
                                        ],
                                        metadata: {
                                             user: booking.user.toString(),
                                             acceptedBid: bid!._id.toString(),
                                             booking: booking._id.toString(),
                                             serviceCategory: booking.serviceCategory.toString(),
                                             method: booking.paymentMethod,
                                             amount: booking.finalAmount,
                                             notificationReceivers: JSON.stringify(notificationReceivers),
                                             isAcceptedBidChanged: false,
                                             previouslyAcceptedBidProvider: '',
                                        },
                                        success_url: `${config.stripe.success_url}?bookingId=${bookingId}`,
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
                    throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid transition from "work started"');
               case BOOKING_STATUS.COMPLETED:
                    throw new AppError(StatusCodes.BAD_REQUEST, 'Cannot update completed booking');
               case BOOKING_STATUS.CANCELLED:
                    throw new AppError(StatusCodes.BAD_REQUEST, 'Cannot update cancelled booking');
               default:
                    throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid status');
          }

          const updatedBooking = await Booking.findOneAndUpdate({ _id: bookingId }, { status }, { new: true, session });

          const updatedBid = bid ? await Bid.findOneAndUpdate({ _id: bid._id }, { status }, { new: true, session }) : null;

          await session.commitTransaction();
          return { updatedBooking, updatedBid };
     } catch (error) {
          await session.abortTransaction();
          throw error;
     } finally {
          session.endSession();
     }
};

const cancelBooking = async (orderId: string, bookingCancelReason: CANCELL_OR_REFUND_REASON, user: IJwtPayload) => {
     const session = await mongoose.startSession();
     session.startTransaction();

     try {
          // isExistBooking by this user
          const isExistBooking = await Booking.findOne({
               _id: new Types.ObjectId(orderId),
               status: { $in: [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED] },
               paymentStatus: PAYMENT_STATUS.UNPAID,
          }).session(session);
          console.log('🚀 ~ cancelBooking ~ isExistBooking:', isExistBooking);
          if (!isExistBooking) {
               throw new AppError(StatusCodes.NOT_FOUND, 'Booking not found. Booking status must be pending and Payment must be unpaid to cancel');
          }
          if (user.role === USER_ROLES.SERVICE_PROVIDER && isExistBooking.serviceProvider?.toString() !== user.id) {
               throw new AppError(StatusCodes.FORBIDDEN, 'You are not authorized as service provider to cancel this booking');
          } else if (user.role === USER_ROLES.USER && isExistBooking.user?.toString() !== user.id) {
               throw new AppError(StatusCodes.FORBIDDEN, 'You are not authorized as user to cancel this booking');
          }

          // update booking for cancel
          isExistBooking.status = BOOKING_STATUS.CANCELLED;
          isExistBooking.bookingCancelReason = bookingCancelReason;
          isExistBooking.cancelledBy = {
               role: user.role as USER_ROLES,
               id: new Types.ObjectId(user.id),
          };
          isExistBooking.cancelledAt = new Date();
          await isExistBooking.save({ session });
          if (isExistBooking.acceptedBid) {
               // update bid for cancel
               const isExistBid = await Bid.findOne({ _id: isExistBooking.acceptedBid, status: { $in: [BID_STATUS.PENDING, BID_STATUS.ACCEPTED, BID_STATUS.REJECTED] } }).session(session);
               if (!isExistBid) {
                    throw new AppError(StatusCodes.NOT_FOUND, 'Bid not found');
               }
               isExistBid.status = BID_STATUS.CANCELLED;
               isExistBid.bidCancelReason = bookingCancelReason;
               await isExistBid.save({ session });
          }

          const isExistUser = await User.findByIdAndUpdate(
               user.id,
               {
                    $inc: {
                         adminDueAmount: 10, // Increment adminDueAmount by 10
                         bookingCancelCount: 1, // Increment bookingCancelCount by 1
                    },
               },
               { new: true, session },
          );
          if (!isExistUser) {
               throw new AppError(StatusCodes.NOT_FOUND, 'User not found');
          }

          // Send mail notification for the manager and client
          const admins = await User.find({ role: { $in: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN] } })
               .select('_id')
               .session(session);

          const notificationReceivers = [
               ...admins.map((a: any) => a._id.toString()),
               (isExistBooking.user as any).toString(),
               isExistBooking.serviceProvider ? isExistBooking.serviceProvider.toString() : undefined,
          ].filter(Boolean);
          for (const receiverId of notificationReceivers) {
               await sendNotifications({
                    receiver: receiverId as unknown as Types.ObjectId,
                    type: NOTIFICATION_MODEL_TYPE.BOOKING,
                    message: `Booking cancelled by ${user.role}. Reason: ${bookingCancelReason}`,
                    reference: isExistBooking._id,
                    title: NotificationTitle.BOOKING_CANCELLED,
               });
          }

          if (isExistUser.role === USER_ROLES.SERVICE_PROVIDER) {
               // A warning message is shown: cancellations negatively affect the provider’s rating.
               io.emit(`reminder::${isExistUser?._id}`, 'cancellations negatively affect the provider’s rating.');
               //The provider’s rating is reduced immediately.(The first cancellation does not impact rating. From the third cancellation onward, the rating will be reduced.)
               if (isExistUser?.bookingCancelCount && isExistUser?.bookingCancelCount >= 3 && isExistUser?.avgRating > 1) {
                    isExistUser.avgRating -= RATING_PANALTY;
                    await isExistUser?.save();
               }
               // If repeated, the account will be temporarily suspended.
               const sevenDaysAgo = new Date();
               sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

               const cancelledBookingsCountByUserWithinLast7Days = await Booking.countDocuments({
                    user: isExistUser?._id,
                    status: BOOKING_STATUS.CANCELLED,
                    cancelledBy: isExistUser?._id,
                    cancelledAt: { $gte: sevenDaysAgo }, // Get bookings cancelled *within* the last 7 days
               });

               if (cancelledBookingsCountByUserWithinLast7Days > MAXIMUM_WEEKLY_CANCEL_LIMIT) {
                    isExistUser!.status = 'blocked';
                    isExistUser!.blockedAt = new Date();
                    await isExistUser?.save();
                    await sendNotifications({
                         receiver: isExistUser._id,
                         type: NOTIFICATION_MODEL_TYPE.BOOKING,
                         title: NotificationTitle.BOOKING_CANCELLED,
                         message: `Your are temporarily Blocked as you have crossed you weekly max cancel limit: ${MAXIMUM_WEEKLY_CANCEL_LIMIT}. Plz request to unblock or contact with Admin`,
                         reference: isExistBooking._id,
                    });
               }
          }

          // Commit the session if no issues found
          await session.commitTransaction();
          return { booking: isExistBooking };
     } catch (error) {
          // Rollback the transaction in case of an error
          await session.abortTransaction();
          throw error; // Re-throw the error to be handled by the caller
     } finally {
          // End the session
          session.endSession();
     }
};

const acceptBid = async (bookingId: string, bidId: string, user: IJwtPayload | any) => {
     const session = await mongoose.startSession();
     session.startTransaction();

     try {
          const thisCustomer = await User.findOne({ _id: user.id }).session(session);
          const thisBooking = await Booking.findOne({ _id: bookingId, user: user.id }).session(session);
          console.log('🚀 ~ acceptBid ~ thisBooking:', thisBooking);

          if (!thisBooking || thisBooking.status !== BOOKING_STATUS.PENDING) {
               throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid or non-pending booking');
          }

          const isExistBid = await Bid.findOne({
               _id: bidId,
               serviceCategory: thisBooking.serviceCategory,
               status: BID_STATUS.PENDING,
          })
               .populate('serviceProvider')
               .session(session);

          if (!isExistBid) {
               throw new AppError(StatusCodes.NOT_FOUND, 'Bid not found');
          }

          if (isExistBid.booking && isExistBid.booking.toString() !== bookingId) {
               throw new AppError(StatusCodes.BAD_REQUEST, 'Bid already linked to another booking');
          }

          const admins = await User.find({ role: { $in: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN] } }).session(session);

          // ✅ Accept the bid and update booking
          thisBooking.acceptedBid = isExistBid._id;
          thisBooking.serviceProvider = (isExistBid.serviceProvider as any)._id;
          thisBooking.adminRevenuePercent = (isExistBid.serviceProvider as any)?.adminRevenuePercent;
          thisBooking.status = BOOKING_STATUS.CONFIRMED;
          await thisBooking.validate();
          const updatedBooking = await thisBooking.save({ session });

          isExistBid.isAccepted = true;
          isExistBid.status = BID_STATUS.ACCEPTED;
          isExistBid.booking = thisBooking._id;
          await isExistBid.save({ session });

          await Bid.updateMany({ _id: { $ne: isExistBid._id }, booking: thisBooking._id }, { $set: { isAccepted: false, status: BID_STATUS.REJECTED } }, { session });

          const notificationReceivers = [...admins.map((u) => u._id.toString()), (isExistBid.serviceProvider as any)._id.toString()];
          for (const receiverId of notificationReceivers) {
               await sendNotifications({
                    receiver: receiverId,
                    type: NOTIFICATION_MODEL_TYPE.BOOKING,
                    title: NotificationTitle.NEW_BOOKING,
                    message: `New booking placed by ${thisCustomer?.full_name} Accepting Bid.`,
                    reference: updatedBooking._id,
               });
          }

          await session.commitTransaction();
          return updatedBooking;
     } catch (error) {
          await session.abortTransaction();
          throw error;
     } finally {
          session.endSession();
     }
};

const getServiceCategoryBasedBookingsForProviderToBid = async (query: any, user: IJwtPayload) => {
     // get service category from provider
     const provider = await User.findOne({ _id: user.id, role: USER_ROLES.SERVICE_PROVIDER }).select('serviceCategories').lean();
     const serviceCategories = provider?.serviceCategories || [];
     const queryBuilder = new QueryBuilder(Booking.find({ serviceCategory: { $in: serviceCategories }, status: BOOKING_STATUS.PENDING }), query);
     const result = await queryBuilder.modelQuery;
     const meta = await queryBuilder.countTotal();
     return { meta, result };
};

const getBidsOfBookingByIdToAccept = async (query: Record<string, any>, bookingId: string, user: IJwtPayload) => {
     const booking = await Booking.findOne({ _id: bookingId, user: user.id, status: { $in: [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED] } });
     if (!booking) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Booking not found');
     }
     const queryBuilder = new QueryBuilder(
          Bid.find({ booking: bookingId })
               .populate('serviceProvider', 'full_name businessName image avgRating reviewsCount')
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

const getUnpaginatedBidsOfBookingByIdToAccept = async (bookingId: string) => {
     const booking = await Booking.findOne({ _id: bookingId, status: { $in: [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED] } });
     if (!booking) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Booking not found');
     }
     const result = await Bid.find({ booking: bookingId, status: BID_STATUS.PENDING });
     return result;
};

const changeAcceptedBid = async (bookingId: string, newBidId: string, user: IJwtPayload) => {
     const session = await mongoose.startSession();
     session.startTransaction();

     try {
          // Find the customer and booking
          const thisCustomer = await User.findOne({ _id: user.id }).session(session);
          const thisBooking = await Booking.findOne({ _id: bookingId, user: user.id, status: { $in: [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED] } }).session(session);

          if (!thisBooking) {
               throw new AppError(StatusCodes.NOT_FOUND, 'Only pending or confirmed booking can apply to change accepted bid. Booking not found');
          }

          if (!thisBooking.acceptedBid) {
               throw new AppError(StatusCodes.BAD_REQUEST, 'No bid is accepted yet for this booking');
          }

          // Check if the new bid exists and is valid
          const isExistBid = await Bid.findOne({ _id: { $ne: thisBooking.acceptedBid, $eq: newBidId }, serviceCategory: thisBooking.serviceCategory, isAccepted: false })
               .populate('serviceProvider')
               .session(session);
          if (!isExistBid) {
               throw new AppError(StatusCodes.NOT_FOUND, 'New bid not found || not in pending || already accepted');
          }

          // Verify the new bid belongs to this booking (if bid has a booking reference)
          if (isExistBid.booking && isExistBid.booking !== null) {
               if (isExistBid.booking.toString() !== bookingId) {
                    throw new AppError(StatusCodes.BAD_REQUEST, 'New bid does not match with booking');
               }
          }

          // Get the current accepted bid
          const previouslyAcceptedBidToBeChanged = await Bid.findById(thisBooking.acceptedBid).session(session);
          if (!previouslyAcceptedBidToBeChanged) {
               throw new AppError(StatusCodes.NOT_FOUND, 'Current accepted bid not found');
          }

          console.log('previouslyAcceptedBidToBeChanged : 11', previouslyAcceptedBidToBeChanged._id.toString());
          console.log('isExistBid : 11', isExistBid._id.toString());
          console.log('=============================');
          // previouslyAcceptedBidToBeChanged and isExistBid are the same
          if (previouslyAcceptedBidToBeChanged._id.toString() == isExistBid._id.toString()) {
               throw new AppError(StatusCodes.BAD_REQUEST, 'New bid is the same as the current accepted bid');
          }

          // Update the current accepted bid to rejected status
          previouslyAcceptedBidToBeChanged.isAccepted = false;
          previouslyAcceptedBidToBeChanged.status = BID_STATUS.REJECTED;
          await previouslyAcceptedBidToBeChanged.save({ session });

          // Refund the previous payment if applicable
          const previousPaymentOnPreviouslyAcceptedBid = await Payment.findOne({ booking: bookingId }).session(session);
          if (previousPaymentOnPreviouslyAcceptedBid && previousPaymentOnPreviouslyAcceptedBid.status === PAYMENT_STATUS.PAID) {
               if (previousPaymentOnPreviouslyAcceptedBid.method === PAYMENT_METHOD.ONLINE && thisBooking.isPaymentTransferd) {
                    const resultRefundOnline = await PaymentService.refundPayment(previousPaymentOnPreviouslyAcceptedBid._id.toString(), user, CANCELL_OR_REFUND_REASON.BID_CHANGED_BY_USER);
                    if (resultRefundOnline) {
                         console.log('refund online', resultRefundOnline);
                    } else {
                         throw new AppError(StatusCodes.BAD_REQUEST, 'Previous ONLINE payment refund failed');
                    }
               } else {
                    previousPaymentOnPreviouslyAcceptedBid.isNeedRefund = true;
                    await previousPaymentOnPreviouslyAcceptedBid.save({ session });
                    throw new AppError(StatusCodes.BAD_REQUEST, 'Previous payment is not online payment. So do the refund manually first');
               }
          }

          // // **Payment Handling for the new accepted bid**
          let result;

          const admins = await User.find({ role: { $in: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN] } }).session(session);

          if (thisBooking.paymentMethod === PAYMENT_METHOD.CASH) {
               // Update booking with accepted bid
               thisBooking.acceptedBid = isExistBid._id;
               thisBooking.serviceProvider = (isExistBid.serviceProvider as any)._id;
               thisBooking.status = BOOKING_STATUS.CONFIRMED;
               thisBooking.adminRevenuePercent = (isExistBid.serviceProvider as any)?.adminRevenuePercent;
               await thisBooking.validate();

               const updatedBooking = await thisBooking.save({ session });
               if (!updatedBooking) {
                    throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to update booking');
               }

               // Update the bid status to accepted
               isExistBid.isAccepted = true;
               isExistBid.status = BID_STATUS.ACCEPTED;
               isExistBid.booking = thisBooking._id as Types.ObjectId;
               await isExistBid.save({ session });

               // Update all other bids to rejected
               await Bid.updateMany({ _id: { $ne: isExistBid._id }, booking: thisBooking._id }, { $set: { isAccepted: false, status: BID_STATUS.REJECTED } }, { session });

               // delete old payment
               const oldPayment = await Payment.findByIdAndDelete(thisBooking.payment).session(session);
               if (!oldPayment) {
                    throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to delete old payment');
               }

               const transactionId = generateTransactionId();
               const payment = new Payment({
                    user: updatedBooking.user,
                    booking: updatedBooking._id,
                    serviceCategory: updatedBooking.serviceCategory,
                    method: updatedBooking.paymentMethod,
                    transactionId,
                    amount: updatedBooking.finalAmount,
               });
               updatedBooking.payment = payment._id;
               await updatedBooking.save({ session });
               await payment.save({ session });

               // Generate PDF invoice and email it
               const pdfBuffer = await generateBookingInvoicePDF(updatedBooking);
               const values = {
                    name: thisCustomer?.full_name as string,
                    email: thisCustomer?.email as string,
                    booking: updatedBooking,
                    attachments: [
                         {
                              filename: `invoice-${updatedBooking._id}.pdf`,
                              content: pdfBuffer,
                              contentType: 'application/pdf',
                         },
                    ],
               };
               const emailTemplateData = emailTemplate.bookingInvoice(values);
               emailHelper.sendEmail({
                    ...emailTemplateData,
                    attachments: values.attachments,
               });

               result = updatedBooking;

               // Send notifications and emails (not inside the transaction, as they are external calls)
               const notificationReceivers = [...admins.map((u: any) => u._id.toString()), (isExistBid.serviceProvider as any)._id.toString()];

               for (const receiverId of notificationReceivers) {
                    await sendNotifications({
                         receiver: receiverId as unknown as Types.ObjectId,
                         type: NOTIFICATION_MODEL_TYPE.BOOKING,
                         message: `Booking bid changed by ${thisCustomer?.full_name}. New service provider assigned.`,
                         reference: updatedBooking._id,
                         title: NotificationTitle.BID_CHANGED,
                    });
               }

               // Also notify the previous service provider about the change
               if (previouslyAcceptedBidToBeChanged.serviceProvider) {
                    await sendNotifications({
                         receiver: previouslyAcceptedBidToBeChanged.serviceProvider as unknown as Types.ObjectId,
                         type: NOTIFICATION_MODEL_TYPE.BOOKING,
                         message: `Your accepted bid for booking ${updatedBooking._id} has been cancelled by the customer ${thisCustomer?.full_name}.`,
                         reference: updatedBooking._id,
                         title: NotificationTitle.BID_CHANGED,
                    });
               }
          } else if (thisBooking.paymentMethod === PAYMENT_METHOD.ONLINE) {
               // notificationReceivers
               const notificationReceivers = [...admins.map((u: any) => u._id.toString()), (isExistBid.serviceProvider as any)._id.toString()];
               // Update booking with accepted bid
               thisBooking.acceptedBid = isExistBid._id;
               thisBooking.adminRevenuePercent = (isExistBid.serviceProvider as any)?.adminRevenuePercent;
               thisBooking.serviceProvider = (isExistBid.serviceProvider as any)._id;
               thisBooking.status = BOOKING_STATUS.CONFIRMED;
               await thisBooking.validate();

               // Handle online payment using Stripe
               const stripeCustomer = await stripe.customers.create({
                    name: thisCustomer?.full_name,
                    email: thisCustomer?.email,
               });
               await User.findByIdAndUpdate(thisCustomer?.id, { $set: { stripeCustomerId: stripeCustomer.id } }, { session });

               const stripeSessionData: any = {
                    payment_method_types: ['card'],
                    mode: 'payment',
                    customer: stripeCustomer.id,
                    line_items: [
                         {
                              price_data: {
                                   currency: DEFAULT_CURRENCY.SAR || 'sar',
                                   product_data: {
                                        name: 'Amount',
                                   },
                                   unit_amount: thisBooking.finalAmount! * 100, // Convert to cents
                              },
                              quantity: 1,
                         },
                    ],
                    metadata: {
                         user: thisBooking.user.toString(),
                         acceptedBid: isExistBid._id.toString(),
                         booking: thisBooking._id.toString(),
                         serviceCategory: thisBooking.serviceCategory.toString(),
                         method: thisBooking.paymentMethod,
                         amount: thisBooking.finalAmount,
                         notificationReceivers: JSON.stringify(notificationReceivers),
                         previouslyAcceptedBidProvider: previouslyAcceptedBidToBeChanged.serviceProvider?.toString(),
                         isAcceptedBidChanged: true,
                    },
                    success_url: config.stripe.success_url,
                    cancel_url: config.stripe.cancel_url,
               };
               try {
                    const session = await stripe.checkout.sessions.create(stripeSessionData);
                    console.log({
                         url: session.url,
                    });
                    result = { url: session.url };
               } catch (error) {
                    console.log({ error });
                    result = { message: 'Bid no changed', booking: thisBooking }; // Fallback to booking without payment URL
               }
          }

          // Commit transaction at the end
          await session.commitTransaction();
          return result;
     } catch (error) {
          // Rollback transaction in case of error
          await session.abortTransaction();
          throw error; // Re-throw the error for external handling
     } finally {
          // End the session
          session.endSession();
     }
};

const getServiceCategoryBasedBidsToAccept = async (query: Record<string, any>, serviceCategoryId: string) => {
     const queryBuilder = new QueryBuilder(Bid.find({ serviceCategory: serviceCategoryId }), query);
     const bids = await queryBuilder.modelQuery;
     const meta = await queryBuilder.countTotal();
     return { meta, bids };
};

const reScheduleBookingById = async (
     bookingId: string,
     bookingData: {
          bookingDate: Date;
          bookingTime: Date;
     },
     user: IJwtPayload,
) => {
     const session = await mongoose.startSession();
     session.startTransaction();
     try {
          const thisBooking = await Booking.findOne({ _id: bookingId, user: user.id, status: { $in: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.PENDING] } }).session(session);
          if (!thisBooking) {
               throw new AppError(StatusCodes.NOT_FOUND, 'Booking not found or booking either completed or cancelled or in processing');
          }
          const combinedDateTime = new Date(combineBookingDateTime(bookingData.bookingDate?.toString() as string, bookingData.bookingTime?.toString() as string));
          const combinedOldBookingDateTime = new Date(combineBookingDateTime(thisBooking.bookingDate?.toString() as string, thisBooking.bookingTime?.toString() as string));
          // ensure booking date and time is not less than current date and time+not as same as previous booking date and time
          if (combinedDateTime < new Date() || combinedDateTime === combinedOldBookingDateTime) {
               throw new AppError(StatusCodes.BAD_REQUEST, 'Booking date and time must be different from previous booking date and time and must be greater than current date and time');
          }
          thisBooking.bookingDate = combinedDateTime;
          thisBooking.bookingTime = combinedDateTime;
          await thisBooking.save({ session });

          // send notification to user
          await sendNotifications({
               receiver: user.id as unknown as Types.ObjectId,
               type: NOTIFICATION_MODEL_TYPE.BOOKING,
               message: `Booking: ${thisBooking._id} is re-scheduled for ${bookingData.bookingDate} at ${bookingData.bookingTime} by ${user.role}`,
               reference: thisBooking._id,
               title: NotificationTitle.BOOKING_RE_SCHEDULED,
          });
          // commit transaction
          await session.commitTransaction();
          return thisBooking;
     } catch (error) {
          console.log(error);
          // Abort the transaction if any error occurs
          await session.abortTransaction();
          throw error;
     } finally {
          session.endSession();
     }
};

// remidUserAboutTheirAdminDueAmount
const remidUserAboutTheirAdminDueAmount = async () => {
     const users = await User.find({
          role: USER_ROLES.SERVICE_PROVIDER,
          adminDueAmount: { $gte: DUE_AMOUNT_FOR_REMIND },
     });
     if (!users) {
          throw new AppError(StatusCodes.NOT_FOUND, 'User not found');
     }

     // Send socket notification to user about their admin due amount
     cronJobs(users);
};

// request colose ride
const requestCompleteOTP = async (bookingId: string, user: IJwtPayload) => {
     const booking = await Booking.findOne({ _id: bookingId, status: BOOKING_STATUS.WORK_STARTED, serviceProvider: user.id });

     if (!booking) {
          throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid booking or booking not in progress');
     }

     const otp = generateOTP();

     // Save as string and mark as modified
     booking.completeOtp = otp;
     booking.verifyCompleteOtp = false;
     booking.isCompleteRequest = true;
     await booking.save();

     console.log('Generated OTP for bid:', booking._id, 'OTP:', booking.completeOtp, 'Type:', typeof booking.completeOtp);

     await sendNotifications({
          title: NotificationTitle.BOOKING_COMPLETED,
          receiver: booking.user,
          message: `Verify Otp to proceed completion.bookingId:${booking._id}; otp:${booking.completeOtp}; verifyCompleteOtp: ${booking.verifyCompleteOtp}`,
          type: NOTIFICATION_MODEL_TYPE.BOOKING,
     });

     return {
          message: 'Otp sent',
     };
};

// complete ride with otp
const verifyCompleteOTP = async (payload: any, user: IJwtPayload) => {
     // First check if ride exists and get current OTP
     const booking = await Booking.findOne({ _id: payload.bookingId, status: BOOKING_STATUS.WORK_STARTED, user: user.id }).select('+completeOtp'); // Explicitly include otp

     if (!booking) {
          throw new AppError(StatusCodes.BAD_REQUEST, 'Booking not found');
     }

     if (!booking.completeOtp) {
          throw new AppError(StatusCodes.BAD_REQUEST, 'No OTP generated for this booking');
     }

     // Compare as strings
     if (booking.completeOtp.toString() !== payload.otp.toString()) {
          throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid OTP');
     }

     // Use atomic update
     const updatedBooking = await Booking.findOneAndUpdate(
          {
               _id: booking._id,
               completeOtp: booking.completeOtp, // Ensure OTP hasn't changed
               status: BOOKING_STATUS.WORK_STARTED,
          },
          {
               $set: { verifyCompleteOtp: true, isCompleteRequest: false },
               $unset: { completeOtp: '' },
          },
          { new: true },
     );

     if (!updatedBooking) {
          throw new AppError(StatusCodes.CONFLICT, 'Booking state changed during verification');
     }
     // Emit ride-completed event
     if (updatedBooking._id) {
          sendNotifications({
               reference: updatedBooking._id,
               receiver: updatedBooking.user,
               message: 'Booking complete otp request verified successfully',
               type: NOTIFICATION_MODEL_TYPE.BOOKING,
          });
     }

     console.log('Booking completed successfully:', updatedBooking._id);
     return updatedBooking;
};

export const BookingService = {
     createBooking,
     getBookingDetails,
     getMyBookings,
     changeBookingStatus,
     cancelBooking,
     acceptBid,
     getServiceCategoryBasedBookingsForProviderToBid,
     getBidsOfBookingByIdToAccept,
     getUnpaginatedBidsOfBookingByIdToAccept,
     changeAcceptedBid,
     getServiceCategoryBasedBidsToAccept,
     reScheduleBookingById,
     remidUserAboutTheirAdminDueAmount,
     requestCompleteOTP,
     verifyCompleteOTP,
};
