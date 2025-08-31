import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';
import AppError from '../../../errors/AppError';
import QueryBuilder from '../../builder/QueryBuilder';
import { Service } from '../Service/Service.model';
import { IJwtPayload } from '../auth/auth.interface';
import { IFaq } from './Faq.interface';
import { Faq } from './Faq.model';
import Settings from '../settings/settings.model';

const createFaq = async (payload: IFaq, user: IJwtPayload): Promise<IFaq> => {
     // Start a session for the transaction
     const session = await mongoose.startSession();

     try {
          // Start the transaction
          session.startTransaction();
          // Step 2: Create the FAQ document
          payload.createdBy = new mongoose.Types.ObjectId(user.id);
          const result = await Faq.create([payload], { session });
          if (payload.type === 'Settings') {
               // insert the faq in the settings document
               const isExistSetting = await Settings.findOne().select('_id faqs').session(session);
               if (!isExistSetting) {
                    throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid referenceId.');
               }
               isExistSetting.faqs.push(result[0]._id);
               await isExistSetting.save({ session });
          }
          await session.commitTransaction();
          session.endSession();
          return result[0]; // Return the newly created FAQ document
     } catch (error) {
          // If any error occurs, abort the transaction
          await session.abortTransaction();
          throw error; // Re-throw the error
     } finally {
          // End the session
          session.endSession();
     }
};

const getAllFaqsByType = async (query: Record<string, any>): Promise<{ meta: { total: number; page: number; limit: number }; result: IFaq[] }> => {
     const operation = Faq.find({}).populate('refferenceId', 'name');
     if (query.type) {
          operation.where({ type: query.type });
     }
     const queryBuilder = new QueryBuilder(operation, query);
     const result = await queryBuilder.filter().sort().paginate().fields().modelQuery;
     const meta = await queryBuilder.countTotal();
     return { meta, result };
};

const getAllUnpaginatedFaqsByType = async (query: Record<string, any>): Promise<IFaq[]> => {
     const { type } = query;
     const operation = Faq.find({}).populate('refferenceId', 'name');
     if (type) {
          operation.where({ type });
     }
     const result = await operation;
     if (!result) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Faqs not found.');
     }
     return result;
};

const updateFaq = async (id: string, payload: Partial<IFaq>): Promise<IFaq | null> => {
     const isExist = await Faq.findById(id);
     console.log("🚀 ~ updateFaq ~ isExist:", isExist)
     if (!isExist) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Faq not found.');
     }

     return await Faq.findByIdAndUpdate(id, payload, { new: true });
};

const deleteFaq = async (id: string): Promise<IFaq | null> => {
     const session = await mongoose.startSession();
     session.startTransaction();

     try {
          const result = await Faq.findById(id).session(session);
          if (!result) {
               throw new AppError(StatusCodes.NOT_FOUND, 'Faq not found.');
          }

          result.isDeleted = true;
          result.deletedAt = new Date();
          await result.save({ session });

          if (result.refferenceId) {
               const refModel = mongoose.model(result.type);
               const isExistRefference = await refModel.findById(result.refferenceId).session(session);

               if (isExistRefference) {
                    isExistRefference.faqs.pull(id);
                    await isExistRefference.save({ session });
               }
          }

          await session.commitTransaction();
          session.endSession();

          return result;
     } catch (err) {
          await session.abortTransaction();
          session.endSession();
          throw err;
     }
};

const hardDeleteFaq = async (id: string): Promise<IFaq | null> => {
     const session = await mongoose.startSession();
     session.startTransaction();

     try {
          const result = await Faq.findByIdAndDelete(id).session(session);
          if (!result) {
               throw new AppError(StatusCodes.NOT_FOUND, 'Faq not found.');
          }

          if (result.refferenceId) {
               const refModel = mongoose.model(result.type);
               const isExistRefference = await refModel.findById(result.refferenceId).session(session);

               if (isExistRefference) {
                    isExistRefference.faqs.pull(id);
                    await isExistRefference.save({ session });
               }
          }

          await session.commitTransaction();
          session.endSession();

          return result;
     } catch (err) {
          await session.abortTransaction();
          session.endSession();
          throw err;
     }
};

const getFaqById = async (id: string): Promise<IFaq | null> => {
     const result = await Faq.findById(id);
     if (!result) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Faq not found.');
     }
     return result;
};

const getAllFaqsByServiceId = async (serviceId: string, query: Record<string, any>): Promise<{ meta: { total: number; page: number; limit: number }; result: IFaq[] }> => {
     const isExistService = await Service.findById(serviceId);
     if (!isExistService) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Service not found.');
     }
     const queryBuilder = new QueryBuilder(Faq.find({ refferenceId: serviceId }), query);
     const result = await queryBuilder.filter().sort().paginate().fields().modelQuery;
     const meta = await queryBuilder.countTotal();
     return { meta, result };
};

export const FaqService = {
     createFaq,
     getAllFaqsByType,
     getAllUnpaginatedFaqsByType,
     updateFaq,
     deleteFaq,
     hardDeleteFaq,
     getFaqById,
     getAllFaqsByServiceId,
};
