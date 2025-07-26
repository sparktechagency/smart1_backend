import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';
import AppError from '../../../errors/AppError';
import unlinkFile from '../../../shared/unlinkFile';
import QueryBuilder from '../../builder/QueryBuilder';
import { IJwtPayload } from '../auth/auth.interface';
import { IReport } from './Report.interface';
import { Report } from './Report.model';




const createReport = async (payload: IReport, user: IJwtPayload): Promise<IReport> => {
     // Start a session for the transaction
     const session = await mongoose.startSession();

     try {
          // Start the transaction
          session.startTransaction();

          // Step 1: Check if the referenced document exists based on `type` and `refferenceId`
          const isExistRefference = await mongoose.model(payload.type).findById(payload.refferenceId).session(session);

          if (!isExistRefference) {
               if (payload.images) {
                    payload.images.forEach((image) => {
                         unlinkFile(image);
                    });
               }
               throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid referenceId.');
          }

          // Step 2: Create the Report document
          payload.createdBy = new mongoose.Types.ObjectId(user.id);
          const result = await Report.create([payload], { session });

          if (!result) {
               if (payload.images) {
                    payload.images.forEach((image) => {
                         unlinkFile(image);
                    });
               }
               throw new AppError(StatusCodes.BAD_REQUEST, 'Failed to create report.');
          }

          // Step 3: Update the referenced document (add the newly created Report to `Reports` array)
          isExistRefference.reports.push(result[0]._id); // `result[0]` because create returns an array of documents

          // Step 4: Save the referenced document with the updated `reports` array
          await isExistRefference.save({ session });

          // Commit the transaction if all operations are successful
          await session.commitTransaction();

          return result[0]; // Return the newly created Report document
     } catch (error) {
          // If any error occurs, abort the transaction
          await session.abortTransaction();
          throw error; // Re-throw the error
     } finally {
          // End the session
          session.endSession();
     }
};

const getAllReports = async (query: Record<string, any>): Promise<{ meta: { total: number; page: number; limit: number; }; result: IReport[]; }> => {
     const queryBuilder = new QueryBuilder(Report.find(), query);
     const result = await queryBuilder.filter().sort().paginate().fields().modelQuery;
     const meta = await queryBuilder.countTotal();
     return { meta, result };
};

const getAllUnpaginatedReports = async (): Promise<IReport[]> => {
     const result = await Report.find();
     return result;
};

const updateReport = async (id: string, payload: Partial<IReport>): Promise<IReport | null> => {
     const isExist = await Report.findById(id);
     if (!isExist) {
          if (payload.images) {
               payload.images.forEach((image) => {
                    unlinkFile(image);
               });
          }
          throw new AppError(StatusCodes.NOT_FOUND, 'Report not found.');
     }

     if (payload.images) {
          if (isExist.images) {
               isExist.images.forEach((image) => {
                    unlinkFile(image);
               });
          }
     }
     return await Report.findByIdAndUpdate(id, payload, { new: true });
};


const deleteReport = async (id: string): Promise<IReport | null> => {
     const session = await mongoose.startSession();
     session.startTransaction();

     try {
          const result = await Report.findById(id).session(session);
          if (!result) {
               throw new AppError(StatusCodes.NOT_FOUND, 'Report not found.');
          }

          result.isDeleted = true;
          result.deletedAt = new Date();
          await result.save({ session });

          if (result.refferenceId) {
               const refModel = mongoose.model(result.type);
               const isExistRefference = await refModel.findById(result.refferenceId).session(session);

               if (isExistRefference) {
                    isExistRefference.reports.pull(id);
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



const hardDeleteReport = async (id: string): Promise<IReport | null> => {
     const session = await mongoose.startSession();
     session.startTransaction();

     try {
          const result = await Report.findById(id).session(session);
          if (!result) {
               throw new AppError(StatusCodes.NOT_FOUND, 'Report not found.');
          }

          // Remove from reference model
          if (result.refferenceId) {
               const refModel = mongoose.model(result.type);
               const isExistRefference = await refModel.findById(result.refferenceId).session(session);

               if (isExistRefference) {
                    isExistRefference.reports.pull(id);
                    await isExistRefference.save({ session });
               }
          }

          // Delete report document
          await Report.deleteOne({ _id: id }).session(session);

          // Delete images (not inside the transaction because it’s a file system operation)
          if (result.images) {
               result.images.forEach((image) => {
                    unlinkFile(image); // Make sure this is safe to run after commit
               });
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


const getReportById = async (id: string): Promise<IReport | null> => {
     const result = await Report.findById(id);
     if (!result) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Report not found.');
     }
     return result;
};

const getAllReportsByBookingId = async (bookingId: string, query: Record<string, any>): Promise<{ meta: { total: number; page: number; limit: number; }; result: IReport[]; }> => {
     const queryBuilder = new QueryBuilder(Report.find(), query);
     const result = await queryBuilder.filter().sort().paginate().fields().modelQuery;
     const meta = await queryBuilder.countTotal();
     return { meta, result };
};

export const ReportService = {
     createReport,
     getAllReports,
     getAllUnpaginatedReports,
     updateReport,
     deleteReport,
     hardDeleteReport,
     getReportById,
     getAllReportsByBookingId
};
