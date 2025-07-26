import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';
import AppError from '../../../errors/AppError';
import QueryBuilder from '../../builder/QueryBuilder';
import { Service } from '../Service/Service.model';
import { IJwtPayload } from '../auth/auth.interface';
import { BOOKING_STATUS } from '../booking/booking.enums';
import { IReviews } from './Reviews.interface';
import { Reviews } from './Reviews.model';
import { Booking } from '../booking/booking.model';
import { USER_ROLES } from '../user/user.enums';



const createReviews = async (payload: IReviews, user: IJwtPayload): Promise<IReviews> => {
     // Start a session for the transaction
     const session = await mongoose.startSession();

     try {
          // Start the transaction
          session.startTransaction();
          // step 0: check if review already exists for this refferenceId and type by the user
          const isExistReview = await Reviews.findOne({ refferenceId: payload.refferenceId, type: payload.type, createdBy: user.id }).session(session);
          if (isExistReview) {
               throw new AppError(StatusCodes.BAD_REQUEST, 'You have already reviewed this. Can only update the review.');
          }

          // Step 1: Check if the referenced document exists based on `type` and `refferenceId`
          const isExistRefference = await mongoose.model(payload.type).findById(payload.refferenceId).session(session);

          if (!isExistRefference) {
               throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid referenceId.');
          }

          // user must be either service provider or user of the referenced document
          if (isExistRefference) {
               if (payload.type === 'Booking' && isExistRefference.status !== BOOKING_STATUS.COMPLETED) {
                    throw new AppError(StatusCodes.BAD_REQUEST, 'You are not authorized to create a review.');
               }
               if (isExistRefference.user.toString() !== user.id && isExistRefference.serviceProvider.toString() !== user.id) {
                    throw new AppError(StatusCodes.BAD_REQUEST, 'You are not authorized to create a review.');
               }
          }


          // Step 2: Create the FAQ document
          payload.createdBy = new mongoose.Types.ObjectId(user.id);
          const result = await Reviews.create([payload], { session });

          // Step 3: Update the referenced document (add the newly created FAQ to `faqs` array)
          isExistRefference.reviews.push(result[0]._id); // `result[0]` because create returns an array of documents

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

const getAllReviews = async (query: Record<string, any>): Promise<{ meta: { total: number; page: number; limit: number; }; result: IReviews[]; }> => {
     const queryBuilder = new QueryBuilder(Reviews.find().populate('refferenceId', 'name'), query);
     const result = await queryBuilder.filter().sort().paginate().fields().modelQuery;
     const meta = await queryBuilder.countTotal();
     return { meta, result };
};

const getAllUnpaginatedReviews = async (): Promise<IReviews[]> => {
     const result = await Reviews.find();
     return result;
};

const updateReviews = async (id: string, payload: Partial<IReviews>, user: IJwtPayload): Promise<IReviews | null> => {
     const isExist = await Reviews.findOne({ _id: id, createdBy: user.id });
     if (!isExist) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Review not found or you are not authorized to update this review.');
     }

     return await Reviews.findByIdAndUpdate(id, payload, { new: true });
};


const deleteReviews = async (id: string, user: IJwtPayload): Promise<IReviews | null> => {
     const session = await mongoose.startSession();
     session.startTransaction();

     try {
          let result;
          if (user.role === USER_ROLES.SERVICE_PROVIDER || user.role === USER_ROLES.USER) {
               result = await Reviews.findOne({ _id: id, createdBy: user.id }).session(session);
          } else {
               result = await Reviews.findById(id).session(session);
          }
          if (!result) {
               throw new AppError(StatusCodes.NOT_FOUND, 'Review not found or you are not authorized to delete this review.');
          }

          result.isDeleted = true;
          result.deletedAt = new Date();
          await result.save({ session });

          if (result.refferenceId) {
               const refModel = mongoose.model(result.type);
               const isExistRefference = await refModel.findById(result.refferenceId).session(session);

               if (isExistRefference) {
                    isExistRefference.reviews.pull(id);
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


const hardDeleteReviews = async (id: string): Promise<IReviews | null> => {
     const session = await mongoose.startSession();
     session.startTransaction();

     try {
          const result = await Reviews.findByIdAndDelete(id).session(session);
          if (!result) {
               throw new AppError(StatusCodes.NOT_FOUND, 'Review not found.');
          }

          if (result.refferenceId) {
               const refModel = mongoose.model(result.type);
               const isExistRefference = await refModel.findById(result.refferenceId).session(session);

               if (isExistRefference) {
                    isExistRefference.reviews.pull(id);
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


const getReviewsById = async (id: string): Promise<IReviews | null> => {
     const result = await Reviews.findById(id);
     if (!result) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Review not found.');
     }
     return result;
};

const getAllReviewsByBookingId = async (bookingId: string, query: Record<string, any>): Promise<{ meta: { total: number; page: number; limit: number; }; result: IReviews[]; }> => {
     const isExistBooking = await Booking.findById(bookingId);
     if (!isExistBooking) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Booking not found.');
     }
     const queryBuilder = new QueryBuilder(Reviews.find({ refferenceId: bookingId }), query);
     const result = await queryBuilder.filter().sort().paginate().fields().modelQuery;
     const meta = await queryBuilder.countTotal();
     return { meta, result };
};

export const ReviewsService = {
     createReviews,
     getAllReviews,
     getAllUnpaginatedReviews,
     updateReviews,
     deleteReviews,
     hardDeleteReviews,
     getReviewsById,
     getAllReviewsByBookingId
};
