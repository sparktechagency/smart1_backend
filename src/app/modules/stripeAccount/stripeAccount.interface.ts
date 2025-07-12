import { Types } from 'mongoose';

export interface IStripeAccounts {
  userId: Types.ObjectId; // Reference to the user who owns the account
  accountId: string; // Stripe account ID
  isCompleted: boolean; // Status indicating if the onboarding is completed
}
