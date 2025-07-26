import { StatusCodes } from 'http-status-codes';
import mongoose, { Types } from 'mongoose';
import config from '../../../config';
import AppError from '../../../errors/AppError';
import { emailHelper } from '../../../helpers/emailHelper';
import { sendNotifications } from '../../../helpers/notificationsHelper';
import { emailTemplate } from '../../../shared/emailTemplate';
import unlinkFile from '../../../shared/unlinkFile';
import { generateBookingInvoicePDF } from '../../../utils/generateOrderInvoicePDF';
import QueryBuilder from '../../builder/QueryBuilder';
import stripe from '../../config/stripe.config';
import { IJwtPayload } from '../auth/auth.interface';
import { BID_STATUS, DEFAULT_CURRENCY } from '../Bid/Bid.enum';
import { Bid } from '../Bid/Bid.model';
import { NOTIFICATION_MODEL_TYPE } from '../notification/notification.enum';
import { Payment } from '../Payment/Payment.model';
import { PaymentService } from '../Payment/Payment.service';
import { Service } from '../Service/Service.model';
import { USER_ROLES } from '../user/user.enums';
import { User } from '../user/user.model';
import { BOOKING_STATUS, CANCELL_OR_REFUND_REASON, DEFAULT_BOOKING_RANGE, PAYMENT_METHOD, PAYMENT_STATUS } from './booking.enums';
import { IBooking } from './booking.interface';
import { Booking } from './booking.model';
import { generateTransactionId, transferToServiceProvider } from './booking.utils';


const createBooking = async (bookingData: Partial<IBooking>, user: IJwtPayload) => {
     const session = await mongoose.startSession();
     session.startTransaction();
     try {
          const thisCustomer = await User.findById(user.id).session(session);
          if (!thisCustomer || !thisCustomer.stripeCustomerId) {
               throw new AppError(StatusCodes.NOT_FOUND, 'User or Stripe Customer ID not found');
          }

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
               serviceCategory: createdBooking.serviceCategory,
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
                    receiver: receiverId,
                    type: NOTIFICATION_MODEL_TYPE.BOOKING,
                    title: `New order placed by  ${thisCustomer?.full_name}. But pending for accepted bid. booking id : ${createdBooking._id}`,
                    booking: createdBooking,
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
     const orderQuery = new QueryBuilder(queryOperation.populate(populateOptions), query).search(['user.name', 'user.email', 'services.service.name']).filter().sort().paginate().fields();

     const result = await orderQuery.modelQuery;

     if (!result) {
          throw new AppError(StatusCodes.NOT_FOUND, 'No bookings found');
     }

     const meta = await orderQuery.countTotal();

     return {
          meta,
          result,
     };
};


const changeBookingStatus = async (bookingId: string, status: string, user: IJwtPayload) => {
     const session = await mongoose.startSession();
     session.startTransaction(); // Start the transaction

     try {
          // if status to be cancelled then throws error mentioning the cancel route
          if (status === BOOKING_STATUS.CANCELLED) {
               throw new AppError(StatusCodes.BAD_REQUEST, 'Use method: Delete and route: /api/v1/booking/cancel/:id to cancel a booking');
          }

          // Find order
          const booking = await Booking.findById(bookingId).session(session); // Attach the session to the query
          if (!booking) {
               throw new AppError(StatusCodes.NOT_FOUND, 'Order not Found');
          }

          let bid;
          if (booking.acceptedBid !== null) {
               bid = await Bid.findOne({ _id: booking.acceptedBid }).populate('serviceProvider').session(session);
               if (!bid) {
                    throw new AppError(StatusCodes.NOT_FOUND, 'Bid not Found');
               }
          }

          // Status validation for booking
          switch (booking.status) {
               case BOOKING_STATUS.PENDING:
                    if (status === BOOKING_STATUS.CONFIRMED) {
                         throw new AppError(StatusCodes.BAD_REQUEST, 'Need to accept a bid before confirming the booking first');
                    }
                    break;
               case BOOKING_STATUS.CONFIRMED:
                    if (status === BOOKING_STATUS.ON_THE_WAY) {
                         break;
                    }
                    throw new AppError(StatusCodes.BAD_REQUEST, `Confirmed Booking can't be updated to ${status} can only be updated to "on The Way"`);
               case BOOKING_STATUS.ON_THE_WAY:
                    if (status === BOOKING_STATUS.WORK_STARTED) {
                         break;
                    }
                    throw new AppError(StatusCodes.BAD_REQUEST, `"On The Way" Booking can't be updated to ${status} can only be updated to "work started"`);
               case BOOKING_STATUS.WORK_STARTED:
                    if (status === BOOKING_STATUS.COMPLETED) {
                         if (booking.paymentStatus === PAYMENT_STATUS.PAID) {
                              if (booking.paymentMethod === PAYMENT_METHOD.ONLINE) {
                                   if (booking.isPaymentTransferd === false) {
                                        if ((bid!.serviceProvider as any).stripeConnectedAccount) {
                                             const transfer = await transferToServiceProvider({
                                                  stripeConnectedAccount: (bid!.serviceProvider as any).stripeConnectedAccount,
                                                  finalAmount: booking.finalAmount,
                                                  revenue: (bid!.serviceProvider as any).adminRevenuePercent,
                                                  bookingId: booking._id.toString(),
                                             });
                                             console.log('🚀 ~ changeBookingStatus ~ transfer:', transfer);
                                        } else {
                                             throw new AppError(StatusCodes.BAD_REQUEST, 'Stripe account not found');
                                        }
                                   }
                              }
                         } else if (booking.paymentStatus === PAYMENT_STATUS.UNPAID) {
                              throw new AppError(StatusCodes.BAD_REQUEST, `Payment is not done yet. Do the payment first. payment id : ${booking.payment}`);
                         }
                         break;
                    }
                    throw new AppError(StatusCodes.BAD_REQUEST, `"Work Started" Booking can't be updated to ${status} can only be updated to "completed"`);
               case BOOKING_STATUS.COMPLETED:
                    throw new AppError(StatusCodes.BAD_REQUEST, "COMPLETED Booking can't be updated");
               case BOOKING_STATUS.CANCELLED:
                    throw new AppError(StatusCodes.BAD_REQUEST, "CANCELLED Booking can't be updated");
               default:
                    throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid booking status');
          }

          // Update booking status
          const updatedBooking = await Booking.findOneAndUpdate(
               { _id: new Types.ObjectId(bookingId), acceptedBid: bid!._id },
               { status },
               { new: true, session }
          );

          // Update bid status
          const updatedBid = await Bid.findOneAndUpdate(
               { _id: bid!._id },
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



const cancelBooking = async (orderId: string, bookingCancelReason: CANCELL_OR_REFUND_REASON, user: IJwtPayload) => {
     const session = await mongoose.startSession();
     session.startTransaction();

     try {
          // isExistBooking by this user
          const isExistBooking = await Booking.findOne({ _id: new Types.ObjectId(orderId), status: { $in: [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED] } }).session(session);
          if (!isExistBooking) {
               throw new AppError(StatusCodes.NOT_FOUND, 'Booking not found. Booking status must be pending or confirmed to cancel');
          }
          if (user.role === USER_ROLES.SERVICE_PROVIDER && isExistBooking.serviceProvider?.toString() !== user.id) {
               throw new AppError(StatusCodes.FORBIDDEN, 'You are not authorized as service provider to cancel this booking');
          } else if (user.role === USER_ROLES.USER && isExistBooking.user?.toString() !== user.id) {
               throw new AppError(StatusCodes.FORBIDDEN, 'You are not authorized as user to cancel this booking');
          }
          if (isExistBooking.acceptedBid === null && isExistBooking.payment == null && isExistBooking.paymentStatus !== PAYMENT_STATUS.PAID) {
               isExistBooking.status = BOOKING_STATUS.CANCELLED;
               isExistBooking.bookingCancelReason = bookingCancelReason;
               isExistBooking.cancelledBy = {
                    role: user.role as USER_ROLES,
                    id: new Types.ObjectId(user.id),
               };
               await isExistBooking.save({ session });

               // Send mail notification for the manager and client
               const admins = await User.find({ role: { $in: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN] } }).session(session);
               for (const receiverId of admins) {
                    await sendNotifications({
                         receiver: receiverId,
                         type: NOTIFICATION_MODEL_TYPE.BOOKING,
                         title: `Booking cancelled by ${user.role}. Reason: ${bookingCancelReason}`,
                         booking: isExistBooking,
                    });
               }

               // Commit the session if no issues found
               await session.commitTransaction();
               return { booking: isExistBooking };
          }

          // isExistBid
          const isExistBid = await Bid.findOne({ _id: isExistBooking.acceptedBid, status: { $in: [BID_STATUS.PENDING, BID_STATUS.ACCEPTED, BID_STATUS.REJECTED] } }).session(session);
          if (!isExistBid) {
               throw new AppError(StatusCodes.NOT_FOUND, 'Bid not found');
          }

          // same for payment
          const isExistPayment = await Payment.findOne({ booking: isExistBooking._id, status: { $ne: PAYMENT_STATUS.CANCELLED } }).session(session);
          if (!isExistPayment) {
               throw new AppError(StatusCodes.NOT_FOUND, 'Payment not found');
          }

          // Check if the booking payment status is paid
          if (isExistBooking.paymentStatus === PAYMENT_STATUS.PAID) {
               if (isExistBooking.paymentMethod === PAYMENT_METHOD.ONLINE) {
                    if (isExistBooking.isPaymentTransferd) {
                         throw new AppError(StatusCodes.BAD_REQUEST, 'Payment is already transferd to provider');
                    } else {
                         if (isExistPayment.status !== PAYMENT_STATUS.REFUNDED) {
                              const refundedPayment = await PaymentService.refundPayment(isExistBooking.payment?.toString() || '', user, bookingCancelReason);
                              if (!refundedPayment) {
                                   throw new AppError(StatusCodes.BAD_REQUEST, 'Payment refund failed');
                              }
                         }
                    }

               } else if (isExistBooking.paymentMethod === PAYMENT_METHOD.CASH) {
                    if (isExistPayment.status !== PAYMENT_STATUS.REFUNDED) {
                         isExistPayment.isNeedRefund = true;
                         await isExistPayment.save({ session });
                         throw new AppError(StatusCodes.BAD_REQUEST, 'payment is not online payment. So do the refund manually first');
                    }
               }
          }
          isExistBooking.status = BOOKING_STATUS.CANCELLED;
          isExistBooking.bookingCancelReason = bookingCancelReason;
          isExistBooking.cancelledBy = {
               role: user.role as USER_ROLES,
               id: new Types.ObjectId(user.id),
          };
          await isExistBooking.save({ session });

          isExistBid.status = BID_STATUS.CANCELLED;
          isExistBid.bidCancelReason = bookingCancelReason;
          await isExistBid.save({ session });

          isExistPayment.status = PAYMENT_STATUS.CANCELLED;
          isExistPayment.refundReason = bookingCancelReason;
          await isExistPayment.save({ session });

          // Send mail notification for the manager and client
          const admins = await User.find({ role: { $in: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN] } }).session(session);
          const notificationReceivers = [...admins.map((u: any) => u._id.toString()), (isExistBooking.user as any)._id.toString(), (isExistBooking.serviceProvider as any)._id.toString()];
          for (const receiverId of notificationReceivers) {
               await sendNotifications({
                    receiver: receiverId,
                    type: NOTIFICATION_MODEL_TYPE.BOOKING,
                    title: `Booking cancelled by ${user.role}. Reason: ${bookingCancelReason}`,
                    booking: isExistBooking,
               });
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
          // Find the customer and booking
          const thisCustomer = await User.findOne({ _id: user.id }).session(session);
          const thisBooking = await Booking.findOne({ _id: bookingId, user: user.id }).session(session);
          if (!thisBooking) {
               throw new AppError(StatusCodes.NOT_FOUND, 'Booking not found');
          }
          if (thisBooking.status !== BOOKING_STATUS.PENDING) {
               throw new AppError(StatusCodes.BAD_REQUEST, 'Booking is not in pending status');
          }

          // Check if the bid exists
          const isExistBid = await Bid.findOne({ _id: bidId, serviceCategory: thisBooking.serviceCategory, status: BID_STATUS.PENDING }).populate('serviceProvider').session(session);
          if (!isExistBid) {
               throw new AppError(StatusCodes.NOT_FOUND, 'Bid not found');
          }

          // Check if the bid is already assigned to a booking
          if (isExistBid.booking && isExistBid.booking !== null) {
               if (isExistBid.booking.toString() !== new mongoose.Types.ObjectId(bookingId).toString()) {
                    throw new AppError(StatusCodes.BAD_REQUEST, 'Bid does not match with booking');
               }
          }



          const admins = await User.find({ role: { $in: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN] } }).session(session);
          // Process payment if method is CASH
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
               console.log('🚀 ~ acceptBid ~ updatedBooking:', updatedBooking);

               // Update the bid status to accepted
               isExistBid.isAccepted = true;
               isExistBid.status = BID_STATUS.ACCEPTED;
               isExistBid.booking = thisBooking._id as Types.ObjectId;
               await isExistBid.save({ session });

               // Update all other bids to rejected
               await Bid.updateMany({ _id: { $ne: isExistBid._id }, booking: thisBooking._id }, { $set: { isAccepted: false, status: BID_STATUS.REJECTED } }, { session });

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

               // Update service counts
               await Service.updateMany({ _id: { $in: updatedBooking.services.map((item: any) => item.service) } }, { $inc: { servedCount: 1 } }, { session });

               // Send notifications and emails (not inside the transaction, as they are external calls)
               const notificationReceivers = [...admins.map((u: any) => u._id.toString()), (isExistBid.serviceProvider as any)._id.toString()];
               for (const receiverId of notificationReceivers) {
                    await sendNotifications({
                         receiver: receiverId,
                         type: NOTIFICATION_MODEL_TYPE.BOOKING,
                         title: `New order placed by ${thisCustomer?.full_name} Accepting Bid.`,
                         booking: updatedBooking,
                    });
               }

               // Generate PDF invoice
               const pdfBuffer = await generateBookingInvoicePDF(updatedBooking);

               // Prepare email with PDF attachment
               const values = {
                    name: thisCustomer!.full_name!,
                    email: thisCustomer!.email!,
                    booking: updatedBooking,
                    attachments: [
                         {
                              filename: `invoice-${updatedBooking._id}.pdf`,
                              content: pdfBuffer,
                              contentType: 'application/pdf',
                         },
                    ],
               };

               // Send email with invoice attachment
               const emailTemplateData = emailTemplate.bookingInvoice(values);
               emailHelper.sendEmail({
                    ...emailTemplateData,
                    attachments: values.attachments,
               });

               // Commit the transaction
               await session.commitTransaction();
               return updatedBooking;
          }
          let result;
          if (thisBooking.paymentMethod == PAYMENT_METHOD.ONLINE) {
               // notificationReceivers
               const notificationReceivers = [...admins.map((u: any) => u._id.toString()), (isExistBid.serviceProvider as any)._id.toString()];
               // Update booking with accepted bid
               thisBooking.acceptedBid = isExistBid._id;
               thisBooking.adminRevenuePercent = (isExistBid.serviceProvider as any)?.adminRevenuePercent;
               thisBooking.serviceProvider = (isExistBid.serviceProvider as any)._id;
               thisBooking.status = BOOKING_STATUS.CONFIRMED;
               await thisBooking.validate();

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
                                   currency: DEFAULT_CURRENCY.USD || 'usd',
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
                         previouslyAcceptedBidProvider: '',
                         isAcceptedBidChanged: false,
                    },
                    success_url: config.stripe.success_url,
                    cancel_url: config.stripe.cancel_url,
               };

               try {
                    const session = await stripe.checkout.sessions.create(stripeSessionData);

                    result = { url: session.url, };
               } catch (error) {
                    console.log({ error });
                    throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, 'Stripe session creation failed');
               }
          } else {
               result = { message: 'Bid no accepted', booking: thisBooking };
          }

          // Commit transaction for any other changes
          await session.commitTransaction();
          return result;
     } catch (error) {
          // Rollback the transaction in case of an error
          await session.abortTransaction();
          throw error; // Re-throw the error to be handled by the caller
     } finally {
          // End the session
          session.endSession();
     }
};

const getServiceCategoryBasedBookingsForProviderToBid = async (query: any, user: IJwtPayload) => {
     // get service category from provider
     const provider = await User.findOne({ _id: user.id, role: USER_ROLES.SERVICE_PROVIDER }).select('serviceCategory').lean();
     const queryBuilder = new QueryBuilder(Booking.find({ serviceCategory: provider?.serviceCategory, status: BOOKING_STATUS.PENDING }), query);
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
          const isExistBid = await Bid.findOne({ _id: { $ne: thisBooking.acceptedBid, $eq: newBidId }, serviceCategory: thisBooking.serviceCategory, isAccepted: false }).populate('serviceProvider').session(session);
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

          // previouslyAcceptedBidToBeChanged and isExistBid are the same
          if (previouslyAcceptedBidToBeChanged._id.toString() === isExistBid._id.toString()) {
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
                    await PaymentService.refundPayment(previousPaymentOnPreviouslyAcceptedBid._id.toString(), user, CANCELL_OR_REFUND_REASON.BID_CHANGED_BY_USER);
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
                    name: thisCustomer?.full_name!,
                    email: thisCustomer?.email!,
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
                         receiver: receiverId,
                         type: NOTIFICATION_MODEL_TYPE.BOOKING,
                         title: `Booking bid changed by ${thisCustomer?.full_name}. New service provider assigned.`,
                         booking: updatedBooking,
                    });
               }

               // Also notify the previous service provider about the change
               if (previouslyAcceptedBidToBeChanged.serviceProvider) {
                    await sendNotifications({
                         receiver: previouslyAcceptedBidToBeChanged.serviceProvider.toString(),
                         type: NOTIFICATION_MODEL_TYPE.BOOKING,
                         title: `Your accepted bid for booking ${updatedBooking._id} has been cancelled by the customer ${thisCustomer?.full_name}.`,
                         booking: updatedBooking,
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
                                   currency: DEFAULT_CURRENCY.USD || 'usd',
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
                    result = { message: 'Bid no changed', booking: thisBooking };// Fallback to booking without payment URL
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
};
