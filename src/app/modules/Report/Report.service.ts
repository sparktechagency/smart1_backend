import { StatusCodes } from 'http-status-codes';
import mongoose, { model, Types } from 'mongoose';
import AppError from '../../../errors/AppError';
import unlinkFile from '../../../shared/unlinkFile';
import QueryBuilder from '../../builder/QueryBuilder';
import { IJwtPayload } from '../auth/auth.interface';
import { BOOKING_STATUS } from '../booking/booking.enums';
import { Booking } from '../booking/booking.model';
import Settings from '../settings/settings.model';
import { IReport } from './Report.interface';
import { Report } from './Report.model';
import { populate } from 'dotenv';
import { ReportType } from './Report.enum';

const createReport = async (payload: IReport, user: IJwtPayload): Promise<IReport> => {
     // Start a session for the transaction
     const session = await mongoose.startSession();

     try {
          // Start the transaction
          session.startTransaction();
          // if payload.type = Settings then refferenceId is the id of setting
          if (payload.type === 'Settings') {
               const isExistSetting = await Settings.findOne().select('_id').session(session);
               if (!isExistSetting) {
                    throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid referenceId.');
               }
               payload.refferenceId = isExistSetting._id as Types.ObjectId;
          }

          // step 0: check if report already exists for this refferenceId and type by the user
          const isExistReport = await Report.findOne({ refferenceId: payload.refferenceId, type: payload.type, createdBy: user.id }).session(session);
          if (isExistReport) {
               throw new AppError(StatusCodes.BAD_REQUEST, 'You have already reported this.');
          }

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

          // user must be either service provider or user of the referenced document
          if (isExistRefference) {
               if (payload.type === 'Booking') {
                    if (isExistRefference.status !== BOOKING_STATUS.COMPLETED) {
                         if (payload.images) {
                              payload.images.forEach((image) => {
                                   unlinkFile(image);
                              });
                         }
                         throw new AppError(StatusCodes.BAD_REQUEST, 'You are not authorized to create a review.');
                    }
                    if (isExistRefference.user.toString() !== user.id && isExistRefference.serviceProvider.toString() !== user.id) {
                         if (payload.images) {
                              payload.images.forEach((image) => {
                                   unlinkFile(image);
                              });
                         }
                         throw new AppError(StatusCodes.BAD_REQUEST, 'You are not authorized to create a review.');
                    }
               } else if (payload.type === 'Settings') {
                    // user mustbe a customer or service provider of any of a completed booking
                    const hasAnyBooking = await Booking.find({ user: user.id, status: BOOKING_STATUS.COMPLETED });
                    if (!hasAnyBooking) {
                         if (payload.images) {
                              payload.images.forEach((image) => {
                                   unlinkFile(image);
                              });
                         }
                         throw new AppError(StatusCodes.BAD_REQUEST, 'You are not authorized to create a review. Cause you have no completed booking.');
                    }
               }
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

const getAllReportsByType = async (type: string, query: Record<string, any>): Promise<{ meta: { total: number; page: number; limit: number }; result: IReport[] }> => {
     let queryBuilder;
     if (type == ReportType.SETTINGS) {
          queryBuilder = new QueryBuilder(Report.find({ type }).populate('createdBy', 'full_name image'), query);
     } else if (type !== ReportType.SETTINGS) {
          queryBuilder = new QueryBuilder(
               Report.find({ type }).populate('createdBy', 'full_name image').populate({
                    path: 'refferenceId',
                    select:"serviceProvider",
                    model: type,
                    populate:{
                         model:"User",
                         path: "serviceProvider",
                         select: "full_name image"
                    }
               }),
               query,
          );
     }
     const result = await queryBuilder!.filter().sort().paginate().fields().modelQuery;
     const meta = await queryBuilder!.countTotal();
     return { meta, result };
};

const getAllUnpaginatedReportsByType = async (type: string): Promise<IReport[]> => {
     const result = await Report.find({ type });
     if (!result) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Reports not found.');
     }
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

const getAllReportsByBookingId = async (bookingId: string, query: Record<string, any>): Promise<{ meta: { total: number; page: number; limit: number }; result: IReport[] }> => {
     const queryBuilder = new QueryBuilder(Report.find(), query);
     const result = await queryBuilder.filter().sort().paginate().fields().modelQuery;
     const meta = await queryBuilder.countTotal();
     return { meta, result };
};

const changeReportStatus = async (id: string, payload: Partial<IReport>): Promise<IReport | null> => {
     const isExist = await Report.findById(id);
     if (!isExist) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Report not found.');
     }
     return await Report.findByIdAndUpdate(id, payload, { new: true });
};

export const ReportService = {
     createReport,
     getAllReportsByType,
     getAllUnpaginatedReportsByType,
     updateReport,
     deleteReport,
     hardDeleteReport,
     getReportById,
     getAllReportsByBookingId,
     changeReportStatus,
};
