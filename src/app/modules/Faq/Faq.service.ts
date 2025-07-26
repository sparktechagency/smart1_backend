import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';
import AppError from '../../../errors/AppError';
import QueryBuilder from '../../builder/QueryBuilder';
import { Service } from '../Service/Service.model';
import { IJwtPayload } from '../auth/auth.interface';
import { IFaq } from './Faq.interface';
import { Faq } from './Faq.model';



const createFaq = async (payload: IFaq, user: IJwtPayload): Promise<IFaq> => {
     // Start a session for the transaction
     const session = await mongoose.startSession();

     try {
          // Start the transaction
          session.startTransaction();

          // Step 1: Check if the referenced document exists based on `type` and `refferenceId`
          const isExistRefference = await mongoose.model(payload.type).findById(payload.refferenceId).session(session);

          if (!isExistRefference) {
               throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid referenceId.');
          }

          // Step 2: Create the FAQ document
          payload.createdBy = new mongoose.Types.ObjectId(user.id);
          const result = await Faq.create([payload], { session });

          // Step 3: Update the referenced document (add the newly created FAQ to `faqs` array)
          isExistRefference.faqs.push(result[0]._id); // `result[0]` because create returns an array of documents

          // Step 4: Save the referenced document with the updated `faqs` array
          await isExistRefference.save({ session });

          // Commit the transaction if all operations are successful
          await session.commitTransaction();

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

const getAllFaqs = async (query: Record<string, any>): Promise<{ meta: { total: number; page: number; limit: number; }; result: IFaq[]; }> => {
     const queryBuilder = new QueryBuilder(Faq.find().populate('refferenceId', 'name'), query);
     const result = await queryBuilder.filter().sort().paginate().fields().modelQuery;
     const meta = await queryBuilder.countTotal();
     return { meta, result };
};

const getAllUnpaginatedFaqs = async (): Promise<IFaq[]> => {
     const result = await Faq.find();
     return result;
};

const updateFaq = async (id: string, payload: Partial<IFaq>): Promise<IFaq | null> => {
     const isExist = await Faq.findById(id);
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

const getAllFaqsByServiceId = async (serviceId: string, query: Record<string, any>): Promise<{ meta: { total: number; page: number; limit: number; }; result: IFaq[]; }> => {
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
     getAllFaqs,
     getAllUnpaginatedFaqs,
     updateFaq,
     deleteFaq,
     hardDeleteFaq,
     getFaqById,
     getAllFaqsByServiceId
};
