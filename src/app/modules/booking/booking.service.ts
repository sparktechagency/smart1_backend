import { StatusCodes } from 'http-status-codes';
import { Types } from 'mongoose';
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
import { DEFAULT_CURRENCY } from '../Bid/Bid.enum';
import { Bid } from '../Bid/Bid.model';
import { Payment } from '../Payment/Payment.model';
import { Service } from '../Service/Service.model';
import { USER_ROLES } from '../user/user.enums';
import { User } from '../user/user.model';
import { BOOKING_STATUS, PAYMENT_METHOD, PAYMENT_STATUS } from './booking.enums';
import { IBooking } from './booking.interface';
import { Booking } from './booking.model';
import { generateTransactionId, transferToServiceProvider } from './booking.utils';
import { NOTIFICATION_MODEL_TYPE } from '../notification/notification.enum';

const createBooking = async (bookingData: Partial<IBooking>, user: IJwtPayload) => {
     try {
          const thisCustomer = await User.findById(user.id);
          if (!thisCustomer || !thisCustomer.stripeCustomerId) {
               throw new AppError(StatusCodes.NOT_FOUND, 'User or Stripe Customer ID not found');
          }

          const booking = new Booking({
               ...bookingData,
               user: user.id,
          });

          // Validate the order data
          await booking.validate();

          const createdBooking = await booking.save();
          if (!createdBooking) {
               bookingData.images?.forEach((image) => {
                    unlinkFile(image);
               });
               throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to create booking');
          }

          // get all the admin and super admin
          const admins = await User.find({ role: { $in: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN] } });
          const acceptedBid = await Bid.findById(createdBooking.acceptedBid).populate('serviceProvider');

          let notificationReceivers = admins.map((u: any) => u._id.toString());
          if (!acceptedBid) {
               // send email to user, notification to bidders and admins socket
               for (const receiverId of notificationReceivers) {
                    await sendNotifications({
                         receiver: receiverId,
                         type: NOTIFICATION_MODEL_TYPE.BOOKING,
                         title: `New order placed by  ${thisCustomer?.full_name}.But pending for accepted bid.`,
                         booking: createdBooking,
                    });
               }
               // Generate PDF invoice
               const pdfBuffer = await generateBookingInvoicePDF(createdBooking);

               // Prepare email with PDF attachment
               const values = {
                    name: thisCustomer?.full_name,
                    email: thisCustomer?.email!,
                    booking: createdBooking,
                    attachments: [
                         {
                              filename: `invoice-${createdBooking._id}.pdf`,
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

               return createdBooking;
          } else {
               notificationReceivers = [...admins.map((u: any) => u._id.toString()), acceptedBid?.serviceProvider].map((u: any) => u._id.toString());
               if (createdBooking.paymentMethod === PAYMENT_METHOD.CASH) {
                    const transactionId = generateTransactionId();
                    const payment = new Payment({
                         user: createdBooking.user,
                         booking: createdBooking._id,
                         serviceCategory: createdBooking.serviceCategory,
                         method: createdBooking.paymentMethod,
                         transactionId,
                         amount: createdBooking.finalAmount,
                    });
                    createdBooking.payment = payment._id;
                    await createdBooking.save();
                    await payment.save();

                    // increase the purchase count of the all the proudcts use operatros
                    const updateServedCount = await Service.updateMany({ _id: { $in: createdBooking.services.map((item) => item.service) } }, { $inc: { servedCount: 1 } });

                    // send email to user, notification to bidders and admins socket
                    for (const receiverId of notificationReceivers) {
                         await sendNotifications({
                              receiver: receiverId,
                              type: NOTIFICATION_MODEL_TYPE.BOOKING,
                              title: `New order placed by ${thisCustomer?.full_name} Accepting Bid.`,
                              booking: createdBooking,
                         });
                    }

                    // Generate PDF invoice
                    const pdfBuffer = await generateBookingInvoicePDF(createdBooking);

                    // Prepare email with PDF attachment
                    const values = {
                         name: thisCustomer?.full_name,
                         email: thisCustomer?.email!,
                         booking: createdBooking,
                         attachments: [
                              {
                                   filename: `invoice-${createdBooking._id}.pdf`,
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
               }

               let result;

               if (createdBooking.paymentMethod == PAYMENT_METHOD.ONLINE) {
                    const stripeCustomer = await stripe.customers.create({
                         name: thisCustomer?.full_name,
                         email: thisCustomer?.email,
                    });
                    // findbyid and update the user
                    await User.findByIdAndUpdate(thisCustomer?.id, { $set: { stripeCustomerId: stripeCustomer.id } });
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
                                        unit_amount: createdBooking.finalAmount! * 100, // Convert to cents
                                   },
                                   quantity: 1,
                              },
                         ],
                         metadata: {
                              user: createdBooking.user,
                              booking: createdBooking._id,
                              serviceCategory: createdBooking.serviceCategory,
                              method: createdBooking.paymentMethod,
                              amount: createdBooking.finalAmount,
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
                    }
               } else {
                    result = createdBooking;
               }

               // No transaction commit needed anymore
               // Return the result
               return result;
          }
     } catch (error) {
          console.log(error);
          // Handle any errors without a session rollback
          throw error;
     }
};


const getBookingDetails = async (bookingId: string, user: IJwtPayload) => {
     let booking: IBooking | null = null;

     // Define the common populate structure
     const populateOptions = [
          {
               path: 'user',
               select: 'full_name _id email phone'
          },
          {
               path: 'services.service',
               select: 'serviceCategory image serviceCharge name servedCount'
          },
          {
               path: 'payment',
               select: 'user booking transactionId paymentIntent amount'
          }
     ];

     if (user.role === USER_ROLES.USER) {
          booking = await Booking.findOne({ _id: bookingId, user: user.id }).populate(populateOptions);
          if (!booking) {
               throw new AppError(StatusCodes.FORBIDDEN, 'You are not allowed to watch this order');
          }
     } else if (user.role === USER_ROLES.SERVICE_PROVIDER) {
          // for admin  or provider
          booking = await Booking.findOne({ _id: bookingId, serviceProvider: user.id }).populate(populateOptions);
          if (!booking) {
               throw new AppError(StatusCodes.NOT_FOUND, 'Order not Found');
          }
     }

     // for admin and super admin allowing them
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
               select: 'full_name _id email phone'
          },
          {
               path: 'services.service',
               select: 'serviceCategory image serviceCharge name servedCount'
          },
          {
               path: 'payment',
               select: 'user booking transactionId paymentIntent amount'
          }
     ];
     if (user.role === USER_ROLES.USER) {
          queryOperation = Booking.find({ user: user.id });
     } else if (user.role === USER_ROLES.SERVICE_PROVIDER) {
          queryOperation = Booking.find({ serviceProvider: user.id });
     }
     const orderQuery = new QueryBuilder(queryOperation.populate(populateOptions), query)
          .search(['user.name', 'user.email', 'services.service.name'])
          .filter()
          .sort()
          .paginate()
          .fields();

     const result = await orderQuery.modelQuery;

     const meta = await orderQuery.countTotal();

     return {
          meta,
          result,
     };
};

const changeBookingStatus = async (bookingId: string, status: string, user: IJwtPayload) => {
     // find order
     const booking = await Booking.findById(bookingId);
     if (!booking) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Order not Found');
     }

     // find shop
     const bid = await Bid.findOne({ _id: booking.acceptedBid, isActive: true }).populate('serviceProvider');
     if (!bid) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Shop not Found');
     }

     switch (booking.status) {
          case BOOKING_STATUS.PENDING:
               if (status === BOOKING_STATUS.CONFIRMED) {
                    break;
               }
               throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid order status');
          case BOOKING_STATUS.CONFIRMED:
               if (status === BOOKING_STATUS.COMPLETED && booking.paymentMethod !== PAYMENT_METHOD.CASH && booking.paymentStatus === PAYMENT_STATUS.PAID && booking.isPaymentTransferd === false) {
                    if ((bid.serviceProvider as any).stripeConnectedAccount) {
                         const transfer = await transferToServiceProvider({
                              stripeConnectedAccount: (bid.serviceProvider as any).stripeConnectedAccount,
                              finalAmount: booking.finalAmount,
                              revenue: bid.revenue,
                              orderId: (booking._id as string).toString(),
                         });
                         console.log('🚀 ~ changeOrderStatus ~ transfer:', transfer);
                    } else {
                         throw new AppError(StatusCodes.BAD_REQUEST, 'Stripe account not found');
                    }
                    break;
               }
               if (status === BOOKING_STATUS.COMPLETED && booking.paymentMethod === PAYMENT_METHOD.CASH) {
                    break;
               }
               if (status === BOOKING_STATUS.CANCELLED) {
                    throw new AppError(StatusCodes.BAD_REQUEST, `Order can't be cancelled by this api use cancelOrder api "/order/:id/cancel"`);
               }
               throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid order status');
          case BOOKING_STATUS.COMPLETED:
               throw new AppError(StatusCodes.BAD_REQUEST, "Order status can't be updated");
          default:
               throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid order status');
     }

     const updatedOrder = await Booking.findOneAndUpdate({ _id: new Types.ObjectId(bookingId), shop: bid._id }, { status }, { new: true });
     return updatedOrder;
};

const getAllRefundBookingRequests = async (query: Record<string, unknown>, user: IJwtPayload, shopId: string) => {
     // find shop
     const shop = await Bid.findOne({ _id: new Types.ObjectId(shopId), isActive: true });
     if (!shop) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Shop not Found');
     }

     // check verndor or shop admins authorization
     if (user.role === USER_ROLES.VENDOR || user.role === USER_ROLES.SHOP_ADMIN) {
          if (shop.owner.toString() !== user.id && !shop.admins?.some((admin) => admin.toString() === user.id)) {
               throw new AppError(StatusCodes.FORBIDDEN, 'You are not authorized to update this order');
          }
     }
     const queryBuilder = new QueryBuilder(Booking.find({ status: 'CANCELLED', isNeedRefund: true, shop: shop._id }), query);
     const orders = await queryBuilder.modelQuery;
     const meta = await queryBuilder.countTotal();
     return { meta, orders };
};

const cancelBooking = async (orderId: string, user: IJwtPayload) => {
     /**
      * সবার আগে order cancelation validation করব যেমন,
      * প্রথমে আমরা order এর status যদি completed হয় তাহলে আমরা order cancell করতে পারব না
      *  order এর status যদি cancelled হয় তাহলে আমরা order cancell করতে পারব না
      *  order এর paymentStatus যদি paid হয়+order.status:any i.o completed or cancel তাহলে আমরা order cancell করতে পারব তবে সেক্ষেত্রে refund policy maintain করতে হবে
      *  order এর paymentStatus যদি unpaid হয়+order.status:any i.o completed or cancel তাহলে আমরা order cancell করতে পারব
      *
      * order status যদি not completed হয় তাহলে আমরা order cancell করতে পারব তবে ২ বিষয় আছে
      * ১. order payment status যদি unpaid আমরা প্রথমে order এর status কে cancelled করে order এর মধ্যকার প্রতিটি product এর stock কে বাড়ানো হবে এবং আমরা পরে আমরা প্রথমে order এর status কে cancelled হাবে
      * ২. order payment status যদি paid আমরা প্রথমে order এর status কে cancelled করে order এর মধ্যকার প্রতিটি product এর stock কে বাড়ানো হবে এবং আমরা পরে আমরা প্রথমে order এর status কে cancelled হাবে + buyer এর জন্য refund polilciy implement করতে হবে
      * refund policy:
      * 1. প্রথমে আমরা order model এ field বানাবো isNeedRefund নামে তারপর order.paymentStatus:true হলে cancell এর সাথে সাথে এর isNeedRefund:true set করব তারপর তাকে আমরা stripe account create করার জন্য লিংক পাটাব maile এ আর একটা refund me route বানাব(params এ stripe account id নিব) যেখানে কেউ order id দিলে আমরা তার refund validation করে তাকে stripe.transfer করব
      * refund validation policy: order status cancle কিনা, isNeedRefund true কিনা এরপর stripe.transfer করব আর isNeedRefund false করে দিব
      */

     // isExistOder by this user
     const isExistOrder = await Booking.findOne({ _id: new Types.ObjectId(orderId) });
     if (!isExistOrder) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Order not found');
     }

     if (isExistOrder.status === BOOKING_STATUS.COMPLETED || isExistOrder.status === BOOKING_STATUS.CANCELLED) {
          throw new AppError(StatusCodes.BAD_REQUEST, `${isExistOrder.status} Order can't be cancelled`);
     }

     // find shop
     const shop = await Bid.findOne({ _id: isExistOrder.shop, isActive: true });
     if (!shop) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Shop not Found');
     }

     // check verndor or shop admins authorization
     if (user.role === USER_ROLES.VENDOR || user.role === USER_ROLES.SHOP_ADMIN) {
          if (shop.owner.toString() !== user.id && !shop.admins?.some((admin) => admin.toString() === user.id)) {
               throw new AppError(StatusCodes.FORBIDDEN, 'You are not authorized to update this order');
          }
     }

     if (isExistOrder.paymentStatus === PAYMENT_STATUS.PAID) {
          // করা যাবে cancel তবে refund করতে হবে
          if (isExistOrder.isNeedRefund) {
               throw new AppError(StatusCodes.BAD_REQUEST, 'Order is already need refund');
          }

          isExistOrder.status = BOOKING_STATUS.CANCELLED;
          isExistOrder.isNeedRefund = true;
          await isExistOrder.save();
          // if isPaymentTransferdToVendor the refund needs by vendor
          if (isExistOrder.isPaymentTransferd) {
               return { message: 'Order cancelled successfully but refund needs by vendor cause payment already transferd to vendor', order: isExistOrder };
          }
          // send mail notification for the manager and client
          // make a stripe transfer link to the user for refund
     }

     if (isExistOrder.paymentStatus === PAYMENT_STATUS.UNPAID) {
          // ইজিলি করা যাবে cancel
          isExistOrder.status = BOOKING_STATUS.CANCELLED;
          await isExistOrder.save();
          // send mail notification for the manager and client
     }

     return { message: 'Order cancelled successfully', order: isExistOrder };
};



const refundBooking = async (orderId: string, user: IJwtPayload) => {
     try {
          // Fetch the order with populated payment details
          const order = await Booking.findById(orderId).populate('payment');

          if (!order) {
               throw new AppError(StatusCodes.NOT_FOUND, 'Order not found.');
          }

          // Check if the order needs a refund
          if (!order.isNeedRefund) {
               throw new AppError(StatusCodes.BAD_REQUEST, "This order doesn't require a refund.");
          }
          // Check if the order payment is completed
          const payment = await Payment.findOne({ order: orderId });
          if (!payment || payment.status !== PAYMENT_STATUS.PAID) {
               throw new AppError(StatusCodes.BAD_REQUEST, 'Payment for this order is not successful or not found.');
          }
          // Refund logic with Stripe
          const refundAmount = Math.round(payment.amount * 100); // Convert to integer (cents)
          // Refund logic with Stripe
          const refund = await stripe.refunds.create({
               payment_intent: payment.paymentIntent, // Use the saved paymentIntent
               amount: refundAmount, // Refund the full amount (you can modify this if partial refund is needed)
          });
          console.log('refund', refund);
          // Update the order's payment status to 'REFUNDED' and save it
          order.paymentStatus = PAYMENT_STATUS.REFUNDED;
          order.status = BOOKING_STATUS.CANCELLED; // Cancel the order if the refund is successful
          order.isNeedRefund = false;
          await order.save();

          // update payment status to 'REFUNDED'
          payment.status = PAYMENT_STATUS.REFUNDED;
          await payment.save();

          // Respond with success message and refund details
          return { message: 'Refund processed successfully', refund };
     } catch (error) {
          console.error('Error processing refund:', error);
          throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error processing refund.');
     }
};

export const BookingService = {
     createBooking,
     getBookingDetails,
     getMyBookings,
     changeBookingStatus,
     cancelBooking,
     getAllRefundBookingRequests,
     refundBooking,
};
