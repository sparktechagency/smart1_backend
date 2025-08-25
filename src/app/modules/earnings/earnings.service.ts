import { FilterQuery, Types } from 'mongoose';
import { Earnings, IEarnings } from './earnings.model';
import { DEFAULT_CURRENCY } from '../Bid/Bid.enum';

export class EarningsService {
  // Get earnings for a service provider
  async getServiceProviderEarnings(serviceProviderId: Types.ObjectId): Promise<IEarnings | null> {
    return Earnings.findOne({ serviceProvider: serviceProviderId });
  }

  // Initialize earnings record for a new service provider
  async initializeEarnings(serviceProviderId: Types.ObjectId, currency: string = DEFAULT_CURRENCY.SAR_CAPITAL): Promise<IEarnings> {
    return Earnings.create({
      serviceProvider: serviceProviderId,
      totalEarnings: 0,
      amountTransferred: 0,
      pendingTransfer: 0,
      adminDue: 0,
      currency,
    });
  }

  // Update earnings when a payment is received
  async updateEarningsOnPayment(
    serviceProviderId: Types.ObjectId,
    amount: number,
    adminCommission: number
  ): Promise<IEarnings | null> {
    
    const serviceProviderAmount = amount - adminCommission;
    
    return Earnings.findOneAndUpdate(
      { serviceProvider: serviceProviderId },
      {
        $inc: {
          totalEarnings: serviceProviderAmount,
          pendingTransfer: serviceProviderAmount,
          adminDue: adminCommission,
        },
        lastUpdated: new Date(),
      },
      { new: true }
    );
  }

  // Update when funds are transferred to service provider
  async updateOnFundTransfer(
    serviceProviderId: Types.ObjectId,
    transferAmount: number
  ): Promise<IEarnings | null> {
    return Earnings.findOneAndUpdate(
      { serviceProvider: serviceProviderId, pendingTransfer: { $gte: transferAmount } },
      {
        $inc: {
          amountTransferred: transferAmount,
          pendingTransfer: -transferAmount,
        },
        lastUpdated: new Date(),
      },
      { new: true }
    );
  }

  // Get all earnings with pagination and filtering
  async getAllEarnings(
    filter: FilterQuery<IEarnings> = {},
    page: number = 1,
    limit: number = 10
  ): Promise<{ data: IEarnings[]; total: number }> {
    const skip = (page - 1) * limit;
    
    const [data, total] = await Promise.all([
      Earnings.find(filter)
        .populate('serviceProvider', 'name email')
        .skip(skip)
        .limit(limit)
        .lean(),
      Earnings.countDocuments(filter),
    ]);

    return { data, total };
  }

  // Helper method to get or create earnings record
  private async getOrCreateEarnings(serviceProviderId: Types.ObjectId): Promise<IEarnings> {
    let earnings = await this.getServiceProviderEarnings(serviceProviderId);
    
    if (!earnings) {
      earnings = await this.initializeEarnings(serviceProviderId);
    }
    
    return earnings;
  }

  // Get summary of all earnings
  async getEarningsSummary(): Promise<{
    totalEarnings: number;
    totalTransferred: number;
    totalPending: number;
    totalAdminDue: number;
  }> {
    const result = await Earnings.aggregate([
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: '$totalEarnings' },
          totalTransferred: { $sum: '$amountTransferred' },
          totalPending: { $sum: '$pendingTransfer' },
          totalAdminDue: { $sum: '$adminDue' },
        },
      },
    ]);

    return result[0] || {
      totalEarnings: 0,
      totalTransferred: 0,
      totalPending: 0,
      totalAdminDue: 0,
    };
  }
}

export const earningsService = new EarningsService();
