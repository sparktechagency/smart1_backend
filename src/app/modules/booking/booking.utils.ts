// import { StatusCodes } from 'http-status-codes';
// import AppError from '../../../errors/AppError';
// import stripe from '../../config/stripe.config';
// import { DEFAULT_CURRENCY } from '../Bid/Bid.enum';
// export async function transferToServiceProvider({
//      stripeConnectedAccount,
//      finalAmount,
//      revenue,
//      bookingId,
// }: {
//      stripeConnectedAccount: string;
//      finalAmount: number; // in dollars
//      revenue: number; // in percentage
//      bookingId: string;
// }) {
//      const adminParcentage = revenue;

//      if (!adminParcentage) {
//           throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, 'Admin fee percentage not found');
//      }

//      const adminRevenue = Math.ceil((finalAmount * adminParcentage) / 100);

//      const serviceProviderRevenue = finalAmount - adminRevenue;

//      const balance = await stripe.balance.retrieve();

//      if (balance?.available?.[0].amount < serviceProviderRevenue * 100) {
//           throw new AppError(StatusCodes.BAD_REQUEST, 'Insufficient funds in admin account for transfer');
//      }

//      const serviceProviderAccountFromStripe = await stripe.accounts.retrieve(stripeConnectedAccount);

//      if (serviceProviderAccountFromStripe?.requirements?.disabled_reason) {
//           throw new AppError(StatusCodes.BAD_REQUEST, `Business's stripe account is not enabled: ${serviceProviderAccountFromStripe.requirements.disabled_reason}`);
//      }

//      const transfer = await stripe.transfers.create({
//           amount: Math.round(serviceProviderRevenue * 100), // in cents
//           currency: DEFAULT_CURRENCY.USD || 'usd',
//           destination: stripeConnectedAccount,
//           metadata: {
//                bookingId,
//           },
//           transfer_group: `booking_${bookingId}`,
//      });
//      return transfer;
// }

// export async function createPayout({
//      stripeConnectedAccount,
//      amount,
//      orderId,
// }: {
//      stripeConnectedAccount: string;
//      amount: number; // in dollars
//      orderId: string;
// }) {
//      try {
//           const payout = await stripe.payouts.create({
//                amount: Math.round(amount * 100), // in cents
//                currency: DEFAULT_CURRENCY.USD || 'usd',
//                destination: stripeConnectedAccount,
//                metadata: {
//                     orderId,
//                },
//           });
//           return payout;
//      } catch (error) {
//           console.log({ error });
//           throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, 'Payout failed');
//      }
// }

// export const generateTransactionId = (): string => {
//      const timestamp = Date.now().toString().slice(-6);
//      const randomString = Math.random().toString(36).substring(2, 8);
//      return `${timestamp}${randomString}`;
// };

// export const combineBookingDateTime = (bookingDate: string, bookingTime: string) => {
//      // Extract the date from bookingDate and time from bookingTime
//      const date = new Date(bookingDate).toISOString().split('T')[0]; // Extract just the date part
//      const time = bookingTime.split('T')[1]; // Extract the time part (HH:MM:SS)

//      // Combine the date and time into a valid ISO string
//      const combinedDateTime = `${date}T${time}`;

//      // Return the combined DateTime as a JavaScript Date object
//      return new Date(combinedDateTime);
// };

import { StatusCodes } from 'http-status-codes';
import AppError from '../../../errors/AppError';
import stripe from '../../config/stripe.config';
import { DEFAULT_CURRENCY } from '../Bid/Bid.enum';
import { User } from '../user/user.model';
export async function transferToServiceProvider({
     stripeConnectedAccount,
     finalAmount,
     adminRevenuePercent,
     serviceProvider,
     bookingId,
}: {
     stripeConnectedAccount: string;
     finalAmount: number; // in dollars
     adminRevenuePercent: number; // in percentage
     serviceProvider: string; // service provider ID
     bookingId: string;
}) {
     if (!adminRevenuePercent) {
          throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, 'Admin fee percentage not found');
     }

     // get serviceProvider from db
     const isExistServiceProvider = await User.findById(serviceProvider);
     if (!isExistServiceProvider) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Service provider not found');
     }
     if (isExistServiceProvider.adminDueAmount > finalAmount) {
          isExistServiceProvider.adminDueAmount = 0;
          await isExistServiceProvider.save();
          return { transfer: null, message: 'Admin due amount cleared' };
     }

     let adminRevenue = 0;
     // If the service provider has an admin due amount, add it to the admin revenue
     if (isExistServiceProvider.adminDueAmount > 0) {
          adminRevenue = Math.ceil((finalAmount * adminRevenuePercent) / 100) + isExistServiceProvider.adminDueAmount;
     }

     adminRevenue = Math.ceil((finalAmount * adminRevenuePercent) / 100);

     const serviceProviderRevenue = finalAmount - adminRevenue;

     const balance = await stripe.balance.retrieve();

     if (balance?.available?.[0].amount < serviceProviderRevenue * 100) {
          throw new AppError(StatusCodes.BAD_REQUEST, 'Insufficient funds in admin account for transfer');
     }

     const serviceProviderAccountFromStripe = await stripe.accounts.retrieve(stripeConnectedAccount);

     if (serviceProviderAccountFromStripe?.requirements?.disabled_reason) {
          throw new AppError(StatusCodes.BAD_REQUEST, `Business's stripe account is not enabled: ${serviceProviderAccountFromStripe.requirements.disabled_reason}`);
     }

     const transfer = await stripe.transfers.create({
          amount: Math.round(serviceProviderRevenue * 100), // in cents
          currency: DEFAULT_CURRENCY.USD || 'usd',
          destination: stripeConnectedAccount,
          metadata: {
               bookingId,
          },
          transfer_group: `booking_${bookingId}`,
     });
     return transfer;
}

export async function createPayout({
     stripeConnectedAccount,
     amount,
     orderId,
}: {
     stripeConnectedAccount: string;
     amount: number; // in dollars
     orderId: string;
}) {
     try {
          const payout = await stripe.payouts.create({
               amount: Math.round(amount * 100), // in cents
               currency: DEFAULT_CURRENCY.USD || 'usd',
               destination: stripeConnectedAccount,
               metadata: {
                    orderId,
               },
          });
          return payout;
     } catch (error) {
          console.log({ error });
          throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, 'Payout failed');
     }
}

export const generateTransactionId = (): string => {
     const timestamp = Date.now().toString().slice(-6);
     const randomString = Math.random().toString(36).substring(2, 8);
     return `${timestamp}${randomString}`;
};

export const combineBookingDateTime = (bookingDate: string, bookingTime: string) => {
     // Extract the date from bookingDate and time from bookingTime
     const date = new Date(bookingDate).toISOString().split('T')[0]; // Extract just the date part
     const time = bookingTime.split('T')[1]; // Extract the time part (HH:MM:SS)

     // Combine the date and time into a valid ISO string
     const combinedDateTime = `${date}T${time}`;

     // Return the combined DateTime as a JavaScript Date object
     return new Date(combinedDateTime);
};
