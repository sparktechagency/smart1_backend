import { StatusCodes } from 'http-status-codes';
import AppError from '../../../errors/AppError';
import stripe from '../../config/stripe.config';
import { DEFAULT_CURRENCY } from '../Bid/Bid.enum';
export async function transferToServiceProvider({
     stripeConnectedAccount,
     finalAmount,
     revenue,
     bookingId,
}: {
     stripeConnectedAccount: string;
     finalAmount: number; // in dollars
     revenue: number; // in percentage
     bookingId: string;
}) {
     const adminParcentage = revenue;

     if (!adminParcentage) {
          throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, 'Admin fee percentage not found');
     }

     const adminRevenue = Math.ceil((finalAmount * adminParcentage) / 100);

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
