import { StatusCodes } from 'http-status-codes';
import AppError from '../../../errors/AppError';
import QueryBuilder from '../../builder/QueryBuilder';
import { IJwtPayload } from '../auth/auth.interface';
import { Booking } from '../booking/booking.model';
import { User } from '../user/user.model';
import { IBid } from './Bid.interface';
import { Bid } from './Bid.model';

const createBid = async (payload: IBid, user: IJwtPayload): Promise<IBid> => {
     // get serviceProvider
     const serviceProvider = await User.findById(user.id).select('serviceCategory').lean();
     console.log({ serviceProvider });
     if (!serviceProvider) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Service provider not found.');
     }
     if (payload.booking) {
          // is exist booking or not
          const isExistBooking = await Booking.findOne({ _id: payload.booking, serviceCategory: serviceProvider.serviceCategory });
          if (!isExistBooking) {
               throw new AppError(StatusCodes.NOT_FOUND, 'Booking not found.');
          }
     }

     const result = await Bid.create({ ...payload, serviceProvider: user.id, serviceCategory: serviceProvider.serviceCategory });
     return result;
};

const getAllBids = async (query: Record<string, any>): Promise<{ meta: { total: number; page: number; limit: number; }; result: IBid[]; }> => {
     const queryBuilder = new QueryBuilder(Bid.find(), query);
     const result = await queryBuilder.filter().sort().paginate().fields().modelQuery;
     const meta = await queryBuilder.countTotal();
     return { meta, result };
};

const getAllUnpaginatedBids = async (): Promise<IBid[]> => {
     const result = await Bid.find();
     return result;
};

const updateBid = async (id: string, payload: Partial<IBid>): Promise<IBid | null> => {
     const isExist = await Bid.findById(id);
     if (!isExist) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Bid not found.');
     }
     return await Bid.findByIdAndUpdate(id, payload, { new: true });
};

const deleteBid = async (id: string): Promise<IBid | null> => {
     const result = await Bid.findById(id);
     if (!result) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Bid not found.');
     }
     result.isDeleted = true;
     result.deletedAt = new Date();
     await result.save();
     return result;
};

const hardDeleteBid = async (id: string): Promise<IBid | null> => {
     const result = await Bid.findByIdAndDelete(id);
     if (!result) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Bid not found.');
     }
     return result;
};

const getBidById = async (id: string): Promise<IBid | null> => {
     const result = await Bid.findById(id);
     if (!result) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Bid not found.');
     }
     return result;
};

const getAllBidsByServiceCategoryId = async (serviceCategoryId: string, query: Record<string, any>): Promise<{ meta: { total: number; page: number; limit: number; }; result: IBid[]; }> => {
     const queryBuilder = new QueryBuilder(Bid.find({ serviceCategory: serviceCategoryId }), query);
     const result = await queryBuilder.filter().sort().paginate().fields().modelQuery;
     // handle !result
     if (result.length <= 0) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Bids not found.');
     }
     const meta = await queryBuilder.countTotal();
     return { meta, result };
};

export const BidService = {
     createBid,
     getAllBids,
     getAllUnpaginatedBids,
     updateBid,
     deleteBid,
     hardDeleteBid,
     getBidById,
     getAllBidsByServiceCategoryId
};
