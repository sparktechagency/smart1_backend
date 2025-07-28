import { StatusCodes } from 'http-status-codes';
import { Types } from 'mongoose';
import AppError from '../../../errors/AppError';
import QueryBuilder from '../../builder/QueryBuilder';
import { IJwtPayload } from '../auth/auth.interface';
import { IPaymentCard } from './paymentCard.interface';
import { PaymentCard } from './paymentCard.model';
import { findMatchedPaymentCard } from './paymentCard.utils';



const createPaymentCard = async (payload: IPaymentCard, user: IJwtPayload): Promise<IPaymentCard> => {
     const matchedPaymentCard = await findMatchedPaymentCard(payload.cardNo, user.id);
     if (matchedPaymentCard) {
          throw new AppError(StatusCodes.BAD_REQUEST, 'Card already exists!');
     }
     payload.user = new Types.ObjectId(user.id);
     const result = await PaymentCard.create(payload);
     return result;
};

const getAllPaymentCards = async (query: Record<string, any>): Promise<{ meta: { total: number; page: number; limit: number; }; result: IPaymentCard[]; }> => {
     const queryBuilder = new QueryBuilder(PaymentCard.find().populate('user', 'full_name email'), query);
     const result = await queryBuilder.filter().sort().paginate().fields().modelQuery;
     const meta = await queryBuilder.countTotal();
     return { meta, result };
};

const getAllUnpaginatedPaymentCards = async (): Promise<IPaymentCard[]> => {
     const result = await PaymentCard.find().populate('user', 'full_name email');
     return result;
};

const updateMyPaymentCard = async (cardNo: string, payload: Partial<IPaymentCard>, user: IJwtPayload): Promise<IPaymentCard | null> => {
     if (payload.cardNo) {
          throw new AppError(StatusCodes.BAD_REQUEST, 'Card number cannot be updated! Please create a new card. Or can only update cvvNo and cardExpiryDate.');
     }
     const matchedPaymentCard = await findMatchedPaymentCard(cardNo, user.id);
     if (!matchedPaymentCard) {
          throw new AppError(StatusCodes.BAD_REQUEST, 'Card not found!');
     }

     return await PaymentCard.findByIdAndUpdate(matchedPaymentCard._id, payload, { new: true });
};

const deleteMyPaymentCard = async (id: string, user: IJwtPayload): Promise<IPaymentCard | null> => {
     const matchedPaymentCard = await PaymentCard.findOne({ _id: id, user: user.id });
     if (!matchedPaymentCard) {
          throw new AppError(StatusCodes.BAD_REQUEST, 'Card not found!');
     }
     matchedPaymentCard.isDeleted = true;
     matchedPaymentCard.deletedAt = new Date();
     await matchedPaymentCard.save();
     return matchedPaymentCard;
};

const hardDeleteMyPaymentCard = async (id: string, user: IJwtPayload): Promise<IPaymentCard | null> => {
     const matchedPaymentCard = await PaymentCard.findOne({ _id: id, user: user.id });
     if (!matchedPaymentCard) {
          throw new AppError(StatusCodes.BAD_REQUEST, 'Card not found!');
     }
     const result = await PaymentCard.findByIdAndDelete(matchedPaymentCard._id);
     if (!result) {
          throw new AppError(StatusCodes.NOT_FOUND, 'PaymentCard not found.');
     }
     return result;
};

const getMyPaymentCardByCardNo = async (cardNo: string, user: IJwtPayload): Promise<IPaymentCard | null> => {

     const matchedPaymentCard = await findMatchedPaymentCard(cardNo, user.id);
     if (!matchedPaymentCard) {
          throw new AppError(StatusCodes.NOT_FOUND, 'PaymentCard not found.');
     }
     matchedPaymentCard.cardNo = cardNo;
     return matchedPaymentCard;
};

const getMyPaymentCards = async (query: Record<string, any>, user: IJwtPayload): Promise<{ meta: { total: number; page: number; limit: number; }; result: IPaymentCard[]; }> => {
     const queryBuilder = new QueryBuilder(PaymentCard.find({ user: user.id }).populate('user', 'full_name email'), query);
     const result = await queryBuilder.filter().sort().paginate().fields().modelQuery;
     const meta = await queryBuilder.countTotal();
     return { meta, result };
};

export const paymentCardService = {
     createPaymentCard,
     getAllPaymentCards,
     getAllUnpaginatedPaymentCards,
     updateMyPaymentCard,
     deleteMyPaymentCard,
     hardDeleteMyPaymentCard,
     getMyPaymentCardByCardNo,
     getMyPaymentCards,
};
