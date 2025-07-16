import { StatusCodes } from 'http-status-codes';
import { Types } from 'mongoose';
import config from '../../../config';
import AppError from '../../../errors/AppError';
import { emailHelper } from '../../../helpers/emailHelper';
import { sendNotifications } from '../../../helpers/notificationsHelper';
import { emailTemplate } from '../../../shared/emailTemplate';
import { generateOrderInvoicePDF } from '../../../utils/generateOrderInvoicePDF';
import QueryBuilder from '../../builder/QueryBuilder';
import stripe from '../../config/stripe.config';
import { IJwtPayload } from '../auth/auth.interface';
import { Coupon } from '../coupon/coupon.model';
import { Payment } from '../payment/payment.model';
import { generateTransactionId } from '../payment/payment.utils';
import { Product } from '../product/product.model';
import { Shop } from '../shop/shop.model';
import { USER_ROLES } from '../user/user.enums';
import { User } from '../user/user.model';
import Variant from '../variant/variant.model';
import { BOOKING_STATUS, PAYMENT_METHOD, PAYMENT_STATUS } from './booking.enums';
import { IBooking } from './booking.interface';
import { Booking } from './booking.model';
import { transferToServiceProvider } from './booking.utils';
import { Bid } from '../Bid/Bid.model';

const createBooking = async (orderData: Partial<IBooking>, user: IJwtPayload) => {
     try {
          const thisCustomer = await User.findById(user.id);
          if (!thisCustomer || !thisCustomer.stripeCustomerId) {
               throw new AppError(StatusCodes.NOT_FOUND, 'User or Stripe Customer ID not found');
          }

          if (orderData.services) {
               for (const item of orderData.services) {
                    // Validate product and variant
                    const [isExistProduct, isExistVariant] = await Promise.all([Product.findOne({ _id: item.service, shopId: orderData.shop }), Variant.findById(item.variant)]);

                    if (!isExistProduct) {
                         throw new AppError(StatusCodes.NOT_FOUND, `Product not found with ID: ${item.service} | products must be from the same shop`);
                    }

                    if (!isExistVariant) {
                         throw new AppError(StatusCodes.NOT_FOUND, `Variant not found with ID: ${item.variant}`);
                    }

                    // Check if the variant exists in the product's variants array and validate quantity
                    const variantIndex = isExistProduct.product_variant_Details.findIndex((itm) => itm.variantId.toString() === item.variant.toString());

                    if (variantIndex === -1) {
                         throw new AppError(StatusCodes.NOT_FOUND, `Variant not found in product with ID: ${item.service}`);
                    }

                    if (isExistProduct.product_variant_Details[variantIndex].variantQuantity < item.quantity) {
                         throw new AppError(StatusCodes.BAD_REQUEST, `Variant quantity is not available in product with ID: ${item.service}`);
                    }

                    // Set the unit price for the order item
                    item.serviceCharge = isExistProduct.product_variant_Details[variantIndex].variantPrice;
                    // Decrease the product's variant quantity
                    isExistProduct.product_variant_Details[variantIndex].variantQuantity -= item.quantity;
                    await isExistProduct.save(); // No session required here anymore
               }
          }

          // Handle coupon and update orderData
          if (orderData.coupon) {
               const coupon = await Coupon.findOne({ code: orderData.coupon, shopId: orderData.shop });
               if (coupon) {
                    const currentDate = new Date();

                    // Check if the coupon is within the valid date range
                    if (currentDate < coupon.startDate) {
                         throw new Error(`Coupon ${coupon.code} has not started yet.`);
                    }

                    if (currentDate > coupon.endDate) {
                         throw new Error(`Coupon ${coupon.code} has expired.`);
                    }

                    orderData.coupon = coupon._id as Types.ObjectId;
               } else {
                    throw new Error('Invalid coupon code. and coupon is not available for this shop');
               }
          }

          // Create the order
          const order = new Booking({
               ...orderData,
               user: user.id,
          });

          // Validate the order data
          await order.validate();

          let createdOrder;
          if (orderData.paymentMethod === PAYMENT_METHOD.COD) {
               createdOrder = await order.save();

               const transactionId = generateTransactionId();

               const payment = new Payment({
                    user: user.id,
                    shop: createdOrder.shop,
                    order: createdOrder._id,
                    method: orderData.paymentMethod,
                    transactionId,
                    amount: createdOrder.finalAmount,
               });

               createdOrder.payment = payment._id;
               await createdOrder.save();
               await payment.save();

               // increase the purchase count of the all the proudcts use operatros
               const updatePurchaseCount = await Product.updateMany({ _id: { $in: createdOrder.services.map((item) => item.service) } }, { $inc: { purchaseCount: 1 } });

               // send email to user, notification to shop woner or admins socket
               const shop = await Shop.findById(createdOrder.shop).populate('owner admins');

               const receivers = [...(shop?.admins || []), shop?.owner].map((u: any) => u._id.toString());

               for (const receiverId of receivers) {
                    await sendNotifications({
                         receiver: receiverId,
                         type: 'ORDER',
                         title: `New order placed by test test ${thisCustomer?.full_name}.`,
                         order: createdOrder,
                    });
               }

               // Generate PDF invoice
               const pdfBuffer = await generateOrderInvoicePDF(createdOrder);

               // Prepare email with PDF attachment
               const values = {
                    name: thisCustomer?.full_name,
                    email: thisCustomer?.email!,
                    order: createdOrder,
                    attachments: [
                         {
                              filename: `invoice-${createdOrder._id}.pdf`,
                              content: pdfBuffer,
                              contentType: 'application/pdf',
                         },
                    ],
               };

               // Send email with invoice attachment
               const emailTemplateData = emailTemplate.orderInvoice(values);
               emailHelper.sendEmail({
                    ...emailTemplateData,
                    attachments: values.attachments,
               });
          }

          let result;

          if (orderData.paymentMethod !== PAYMENT_METHOD.COD) {
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
                                   currency: 'usd',
                                   product_data: {
                                        name: 'Amount',
                                   },
                                   unit_amount: order.finalAmount! * 100, // Convert to cents
                              },
                              quantity: 1,
                         },
                    ],
                    metadata: {
                         products: JSON.stringify(orderData.services), // only array are allowed TO PASS as metadata
                         coupon: orderData.coupon?.toString(),
                         shippingAddress: orderData.servicingDestination,
                         paymentMethod: orderData.paymentMethod,
                         user: user.id,
                         shop: orderData.shop,
                         amount: order.finalAmount,
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
               result = order;
          }

          // No transaction commit needed anymore
          // Return the result
          return result;
     } catch (error) {
          console.log(error);
          // Handle any errors without a session rollback
          throw error;
     }
};


const getBookingDetails = async (orderId: string, user: IJwtPayload) => {
     let order: IBooking | null = null;
     if (user.role === USER_ROLES.USER) {
          order = await Booking.findOne({ _id: orderId, user: user.id }).populate('user products.product coupon payment');
          if (!order) {
               throw new AppError(StatusCodes.FORBIDDEN, 'You are not allowed to watch this order');
          }
     } else if (user.role === USER_ROLES.VENDOR || user.role === USER_ROLES.SHOP_ADMIN) {
          order = await Booking.findOne({ _id: orderId }).populate('user products.product coupon payment');
          if (!order) {
               throw new AppError(StatusCodes.NOT_FOUND, 'Order not Found');
          }

          const productOfShop = await Product.findOne({
               _id: order.services[0].service,
               shopId: order.shop,
          });
          if (!productOfShop) {
               throw new AppError(StatusCodes.FORBIDDEN, 'You are not allowed to watch this order');
          }
     }

     // for admin and super admin allowing them
     if (!order) {
          order = await Booking.findById(orderId).populate('user products.product coupon payment');
     }
     if (!order) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Order not Found');
     }
     return order;
};

const getMyBookings = async (query: Record<string, unknown>, user: IJwtPayload) => {
     const orderQuery = new QueryBuilder(Booking.find({ user: user.id }).populate('user products.product coupon'), query)
          .search(['user.name', 'user.email', 'products.product.name'])
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
               if (status === BOOKING_STATUS.PROCESSING) {
                    break;
               }
               throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid order status');
          case BOOKING_STATUS.PROCESSING:
               if (status === BOOKING_STATUS.COMPLETED && booking.paymentMethod !== PAYMENT_METHOD.COD && booking.paymentStatus === PAYMENT_STATUS.PAID && booking.isPaymentTransferd === false) {
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
               if (status === BOOKING_STATUS.COMPLETED && booking.paymentMethod === PAYMENT_METHOD.COD) {
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
     const shop = await Shop.findOne({ _id: new Types.ObjectId(shopId), isActive: true });
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
     const shop = await Shop.findOne({ _id: isExistOrder.shop, isActive: true });
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
