import { Document } from 'mongoose';
import { Types } from 'mongoose';

export interface IEarnings extends Document {
  serviceProvider: Types.ObjectId;
  totalEarnings: number;
  amountTransferred: number;
  pendingTransfer: number;
  adminDue: number;
  currency: string;
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IEarningsResponse {
  _id: string;
  serviceProvider: {
    _id: string;
    name: string;
    email: string;
  };
  totalEarnings: number;
  amountTransferred: number;
  pendingTransfer: number;
  adminDue: number;
  currency: string;
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IEarningsSummary {
  totalEarnings: number;
  totalTransferred: number;
  totalPending: number;
  totalAdminDue: number;
}

export interface IInitializeEarningsRequest {
  serviceProviderId: string;
  currency?: string;
}

export interface IUpdateEarningsOnPaymentRequest {
  serviceProviderId: Types.ObjectId;
  amount: number;
  adminCommission: number;
}

export interface IUpdateOnFundTransferRequest {
  serviceProviderId: Types.ObjectId;
  transferAmount: number;
}

export interface IGetAllEarningsQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
