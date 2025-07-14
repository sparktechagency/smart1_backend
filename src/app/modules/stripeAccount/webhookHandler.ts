import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import Stripe from 'stripe';
import config from '../../../config';
import AppError from '../../../errors/AppError';
import stripe from '../../config/stripe.config';

const webhookHandler = async (req: Request, res: Response): Promise<void> => {
     return console.log({ config, stripe, req, res, handlePaymentSucceeded, handleTransferCreated });
};

export default webhookHandler;

// Function for handling a successful payment
const handlePaymentSucceeded = async (session: Stripe.Checkout.Session) => {
     // try {
     //      const {
     //           products,
     //           coupon,
     //           shippingAddress,
     //           paymentMethod,
     //           user,
     //           shop,
     //           amount,
     //           // extra field for payments gatewayResponse,transactionId,status,order
     //      }: any = session.metadata;
     //      // Parsing the 'products' metadata, as it was previously stringified before sending to Stripe
     //      const productsParsed = JSON.parse(products);
     //      console.log('1', 'productsParsed:', productsParsed);
     //      const paymentIntent = session.payment_intent as string;
     //      console.log('paymentIntent : 2', paymentIntent);
     //      const isPaymentExist = await paymentService.isPaymentExist(paymentIntent);
     //      if (isPaymentExist) {
     //           throw new AppError(StatusCodes.BAD_REQUEST, 'Payment Already exist');
     //      }
     //      console.log('isPaymentExist : 3');
     //      const newOrder = await Booking.create({
     //           products: productsParsed,
     //           coupon,
     //           shippingAddress,
     //           paymentMethod,
     //           paymentStatus: PAYMENT_STATUS.PAID,
     //           shop,
     //           user,
     //      });
     //      console.log('newBooking : 10');
     //      const newPayment = await Payment.create({
     //           user,
     //           order: newOrder._id,
     //           shop,
     //           method: paymentMethod,
     //           status: PAYMENT_STATUS.PAID,
     //           transactionId: session.id,
     //           paymentIntent,
     //           amount,
     //           gatewayResponse: session,
     //           // extra field for payments gatewayResponse,transactionId,status,order
     //      });
     //      newOrder.payment = newPayment._id;
     //      await newOrder.save();
     //      console.log('newPayment : 11');
     //      // send email to user, notification to shop woner or admins socket
     //      /** rabby
     //       * find shop
     //       * make array for specific this shop's owner and admins
     //       * send notification to them using socket
     //       *
     //       * send email to user if poosible send order invoice pdf
     //       */
     //      return newPayment;
     // } catch (error) {
     //      console.error('Error in handlePaymentSucceeded:', error);
     // }
};

// handleTransferCreated
const handleTransferCreated = async (transfer: Stripe.Transfer) => {
     try {
          console.log(`Transfer for user ${transfer.destination} created`);

          // // Get order and shop details from transfer metadata
          // const booking = await Booking.findById(transfer.metadata?.orderId);
          // if (!booking) {
          //      throw new AppError(StatusCodes.BAD_REQUEST, 'Order not found');
          // }
          // // update isTransferd true
          // booking.isPaymentTransferd = true;
          // await booking.save();
     } catch (error) {
          console.error('Error in handleTransferCreated:', error);
     }
};
