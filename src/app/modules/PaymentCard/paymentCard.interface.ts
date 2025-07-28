import { Model, Types } from 'mongoose';

export interface IPaymentCard {
     save(): unknown;
     _id?: Types.ObjectId;
     user: Types.ObjectId;
     description: string;
     cvvNo: string;
     cardExpiryDate: Date;
     cardNo: string;
     createdAt: Date;
     updatedAt: Date;
     isDeleted: boolean;
     deletedAt?: Date;
}


export type PaymentCardModel = {
     isMatchCardNo(cardNo: string, hashCardNo: string): boolean;
} & Model<IPaymentCard>;