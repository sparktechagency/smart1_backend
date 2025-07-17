import { StatusCodes } from 'http-status-codes';
import AppError from '../../../errors/AppError';
import { IPayment } from './Payment.interface';
import { Payment } from './Payment.model';
import QueryBuilder from '../../builder/QueryBuilder';
import unlinkFile from '../../../shared/unlinkFile';

const createPayment = async (payload: IPayment): Promise<IPayment> => {
     const result = await Payment.create(payload);
     return result;
};

const getAllPayments = async (query: Record<string, any>): Promise<{ meta: { total: number; page: number; limit: number; }; result: IPayment[]; }> => {
     const queryBuilder = new QueryBuilder(Payment.find(), query);
     const result = await queryBuilder.filter().sort().paginate().fields().modelQuery;
     const meta = await queryBuilder.countTotal();
     return { meta, result };
};

const getAllUnpaginatedPayments = async (): Promise<IPayment[]> => {
     const result = await Payment.find();
     return result;
};

const updatePayment = async (id: string, payload: Partial<IPayment>): Promise<IPayment | null> => {
     const isExist = await Payment.findById(id);
     if (!isExist) {
          unlinkFile(payload.image!);
          throw new AppError(StatusCodes.NOT_FOUND, 'Payment not found.');
     }

     unlinkFile(isExist.image!); // Unlink the old image
     return await Payment.findByIdAndUpdate(id, payload, { new: true });
};

const deletePayment = async (id: string): Promise<IPayment | null> => {
     const result = await Payment.findById(id);
     if (!result) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Payment not found.');
     }
     result.isDeleted = true;
     result.deletedAt = new Date();
     await result.save();
     return result;
};

const hardDeletePayment = async (id: string): Promise<IPayment | null> => {
     const result = await Payment.findByIdAndDelete(id);
     if (!result) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Payment not found.');
     }
     unlinkFile(result.image!);
     return result;
};

const getPaymentById = async (id: string): Promise<IPayment | null> => {
     const result = await Payment.findById(id);
     if (!result) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Payment not found.');
     }
     return result;
};   

export const PaymentService = {
     createPayment,
     getAllPayments,
     getAllUnpaginatedPayments,
     updatePayment,
     deletePayment,
     hardDeletePayment,
     getPaymentById
};
