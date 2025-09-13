import { Schema, model, Document } from 'mongoose';
import { DEFAULT_CURRENCY } from '../Bid/Bid.enum';

export interface IEarnings extends Document {
  serviceProvider: Schema.Types.ObjectId;
  totalEarnings: number;
  amountTransferred: number;
  pendingTransfer: number;
  adminDue: number;
  currency: string;
  lastUpdated: Date;
}

const earningsSchema = new Schema<IEarnings>(
  {
    serviceProvider: {
      type: Schema.Types.ObjectId,
      ref: 'User', // Assuming you have a User model for service providers
      required: true,
      unique: true,
    },
    totalEarnings: {
      type: Number,
      default: 0,
      min: 0,
    },
    amountTransferred: {
      type: Number,
      default: 0,
      min: 0,
    },
    pendingTransfer: {
      type: Number,
      default: 0,
      min: 0,
    },
    adminDue: {
      type: Number,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      default: DEFAULT_CURRENCY.SAR_CAPITAL,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Index for faster querying
// earningsSchema.index({ serviceProvider: 1 });

export const Earnings = model<IEarnings>('Earnings', earningsSchema);
