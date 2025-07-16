import { StatusCodes } from 'http-status-codes';
import AppError from '../../../errors/AppError';
import stripe from '../../config/stripe.config';
export async function transferToServiceProvider({
     stripeConnectedAccount,
     finalAmount,
     revenue,
     orderId,
}: {
     stripeConnectedAccount: string;
     finalAmount: number; // in dollars
     revenue: number; // in percentage
     orderId: string;
}) {
     const adminParcentage = revenue;

     if (!adminParcentage) {
          throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, 'Admin fee percentage not found');
     }

     const adminRevenue = Math.ceil((finalAmount * adminParcentage) / 100);

     const shopOwnerRevenue = finalAmount - adminRevenue;

     const balance = await stripe.balance.retrieve();

     if (balance?.available?.[0].amount < shopOwnerRevenue * 100) {
          throw new AppError(StatusCodes.BAD_REQUEST, 'Insufficient funds in admin account for transfer');
     }

     const shopAccountFromStripe = await stripe.accounts.retrieve(stripeConnectedAccount);

     if (shopAccountFromStripe?.requirements?.disabled_reason) {
          throw new AppError(StatusCodes.BAD_REQUEST, `Business's stripe account is not enabled: ${shopAccountFromStripe.requirements.disabled_reason}`);
     }

     const transfer = await stripe.transfers.create({
          amount: Math.round(shopOwnerRevenue * 100), // in cents
          currency: 'usd',
          destination: stripeConnectedAccount,
          metadata: {
               orderId,
          },
          transfer_group: `order_${orderId}`,
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
               currency: 'usd',
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
