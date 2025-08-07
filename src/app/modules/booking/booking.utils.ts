import { StatusCodes } from 'http-status-codes';
import cron from 'node-cron';
import { Socket } from 'socket.io';
import AppError from '../../../errors/AppError';
import stripe from '../../config/stripe.config';
import { DEFAULT_CURRENCY } from '../Bid/Bid.enum';
import { IUser } from '../user/user.interface';
import { User } from '../user/user.model';
import { DUE_AMOUNT_FOR_REMIND } from './booking.enums';
export async function transferToServiceProvider({
     stripeConnectedAccount,
     toBeTransferAmount,
     adminRevenuePercent,
     serviceProvider,
     bookingId,
}: {
     stripeConnectedAccount: string;
     toBeTransferAmount: number; // in dollars
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
     let updatedServiceProvider;
     let adminRevenueAmount = 0;

     adminRevenueAmount = Math.ceil((toBeTransferAmount * adminRevenuePercent) / 100);
     const serviceProviderRevenueAmount = toBeTransferAmount - adminRevenueAmount;

     if (isExistServiceProvider.adminDueAmount > serviceProviderRevenueAmount) {
          // isExistServiceProvider.adminDueAmount -= finalAmount;
          // await isExistServiceProvider.save();
          updatedServiceProvider = await User.findByIdAndUpdate(
               isExistServiceProvider.id,
               {
                    $inc: {
                         adminDueAmount: -serviceProviderRevenueAmount,
                    },
               },
               { new: true },
          );
          console.log('🚀 ~ transferToServiceProvider ~ updatedServiceProvider:sExistServiceProvider.adminDueAmount > finalAmount', updatedServiceProvider);
          serviceProviderRevenueAmount = 0;
          return { transfer: null, message: `Admin due amount cleared:${serviceProviderRevenueAmount} | still due: ${isExistServiceProvider.adminDueAmount}` };
     } else if (isExistServiceProvider.adminDueAmount < serviceProviderRevenueAmount) {
          // isExistServiceProvider.adminDueAmount = 0;
          // await isExistServiceProvider.save();
          serviceProviderRevenueAmount -= updatedServiceProvider.adminDueAmount;
          updatedServiceProvider = await User.findByIdAndUpdate(
               isExistServiceProvider.id,
               {
                    $inc: {
                         adminDueAmount: 0,
                    },
               },
               { new: true },
          );
          console.log('🚀 ~ transferToServiceProvider ~ updatedServiceProvider:isExistServiceProvider.adminDueAmount < finalAmount', updatedServiceProvider);
     }

     const balance = await stripe.balance.retrieve();

     if (balance?.available?.[0].amount < serviceProviderRevenueAmount * 100) {
          throw new AppError(StatusCodes.BAD_REQUEST, 'Insufficient funds in admin account for transfer');
     }

     const serviceProviderAccountFromStripe = await stripe.accounts.retrieve(stripeConnectedAccount);

     if (serviceProviderAccountFromStripe?.requirements?.disabled_reason) {
          throw new AppError(StatusCodes.BAD_REQUEST, `Business's stripe account is not enabled: ${serviceProviderAccountFromStripe.requirements.disabled_reason}`);
     }

     const transfer = await stripe.transfers.create({
          amount: Math.round(serviceProviderRevenueAmount * 100), // in cents
          currency: DEFAULT_CURRENCY.SAR || 'sar',
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
               currency: DEFAULT_CURRENCY.SAR || 'sar',
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

export const cronJobs = (users: IUser[]) => {
     // Run every minute: adjust as needed
     cron.schedule('0 6,12,18,21 * * *', () => {
          users.forEach((user: IUser) => {
               if (user.adminDueAmount > DUE_AMOUNT_FOR_REMIND) {
                    const io = (global as any).io as Socket;
                    if (io) {
                         io.emit(`reminder::${user._id}`, {
                              message: `You have admin due amount of ${user.adminDueAmount}. Please clear your dues to continue accepting new bookings.`,
                         });
                    }
               }
          });
     });
};
