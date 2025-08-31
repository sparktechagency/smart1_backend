import { StatusCodes } from 'http-status-codes';
import AppError from '../../../errors/AppError';
import unlinkFile from '../../../shared/unlinkFile';
import QueryBuilder from '../../builder/QueryBuilder';
import { Faq } from '../Faq/Faq.model';
import { ServiceCategory } from '../ServiceCategory/ServiceCategory.model';
import { IService } from './Service.interface';
import { Service } from './Service.model';
import { FAQType } from '../Faq/Faq.enum';
import mongoose from 'mongoose';

const createService = async (payload: IService): Promise<IService> => {
     // check is exist serviceCategory
     const isExistServiceCategory = await ServiceCategory.findById(payload.serviceCategory);
     if (!isExistServiceCategory) {
          unlinkFile(payload.image!);
          throw new AppError(StatusCodes.NOT_FOUND, 'Service category not found.');
     }
     // ensure all the faqs are valid
     let isExistFaqs = [];
     if (payload.faqs) {
          isExistFaqs = await Faq.find({ _id: { $in: payload.faqs }, type: FAQType.SERVICE, refferenceId: null });
          if (!isExistFaqs || isExistFaqs.length !== payload.faqs.length) {
               unlinkFile(payload.image!);
               throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid faq ids.');
          }
     }
     const session = await mongoose.startSession();
     session.startTransaction();
     try {
          // Create the service
          const result = await Service.create([payload], { session });
          if (!result) {
               unlinkFile(payload.image!);
               throw new AppError(StatusCodes.BAD_REQUEST, 'Service not created.');
          }

          // Update the service category to include the new service
          isExistServiceCategory.services?.push(result[0]._id);
          await isExistServiceCategory.save({ session });

          // Update FAQs with the reference ID
          if (payload.faqs) {
               await Faq.updateMany({ _id: { $in: payload.faqs }, refferenceId: null, type: FAQType.SERVICE }, { $set: { refferenceId: result[0]._id, type: FAQType.SERVICE } }, { session });
          }

          // Commit the transaction
          await session.commitTransaction();
          session.endSession();

          return result[0]; // Return the created service
     } catch (error) {
          // If any error occurs, abort the transaction
          await session.abortTransaction();
          session.endSession();

          // Handle file cleanup (if necessary)
          if (payload.image) {
               unlinkFile(payload.image!);
          }

          // Rethrow the error
          throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, 'Service not created.');
     }
};

const getAllServices = async (query: Record<string, any>): Promise<{ meta: { total: number; page: number; limit: number }; result: IService[] }> => {
     const queryBuilder = new QueryBuilder(Service.find().populate('serviceCategory', 'name').populate('faqs', 'question answer'), query);
     const result = await queryBuilder.search(['name', 'description', 'serviceCategory.name']).filter().sort().paginate().fields().modelQuery;
     const meta = await queryBuilder.countTotal();
     return { meta, result };
};

const getAllUnpaginatedServices = async (): Promise<IService[]> => {
     const result = await Service.find().populate('serviceCategory', 'name').populate('faqs', 'question answer');
     return result;
};

const updateService = async (id: string, payload: Partial<IService>): Promise<IService | null> => {
     const isExistService = await Service.findById(id);
     if (!isExistService) {
          unlinkFile(payload.image!);
          throw new AppError(StatusCodes.NOT_FOUND, 'Service not found.');
     }
     if (payload.serviceCategory) {
          const isExistServiceCategory = await ServiceCategory.findById(payload.serviceCategory);
          if (!isExistServiceCategory) {
               unlinkFile(payload.image!);
               throw new AppError(StatusCodes.NOT_FOUND, 'Service category not found.');
          }
     }
     const session = await mongoose.startSession();
     session.startTransaction();
     try {
          // Handle FAQs: remove old references and update with new ones
          if (payload.faqs) {
               // Set old FAQs' `refferenceId` to null
               await Faq.updateMany({ refferenceId: id }, { $set: { refferenceId: null } }, { session });

               // Set new FAQs' `refferenceId` to the service ID
               await Faq.updateMany({ _id: { $in: payload.faqs }, refferenceId: null, type: FAQType.SERVICE }, { $set: { refferenceId: id, type: FAQType.SERVICE } }, { session });
          }

          // Unlink the old image before updating the service
          if (isExistService.image) {
               unlinkFile(isExistService.image);
          }

          // Update the service with the new data
          const updatedService = await Service.findByIdAndUpdate(id, payload, { new: true, session });

          // Commit the transaction
          await session.commitTransaction();
          session.endSession();

          return updatedService;
     } catch (error) {
          // If any error occurs, abort the transaction
          await session.abortTransaction();
          session.endSession();

          // Handle file cleanup if necessary
          if (payload.image) {
               unlinkFile(payload.image!);
          }

          // Rethrow the error
          throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, 'Service not updated.');
     }
};

const deleteService = async (id: string): Promise<IService | null> => {
     const result = await Service.findById(id);
     if (!result) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Service not found.');
     }
     result.isDeleted = true;
     result.deletedAt = new Date();
     await result.save();

     // Step 1: Mark all FAQs as deleted (soft delete)
     await Faq.updateMany(
          { refferenceId: id },
          {
               $set: { isDeleted: true, deletedAt: new Date() },
          },
     );

     // Step 2: Remove service from service category
     if (result.serviceCategory) {
          await ServiceCategory.findByIdAndUpdate(result.serviceCategory, { $pull: { services: result._id } });
     }

     return result;
};

const hardDeleteService = async (id: string): Promise<IService | null> => {
     const result = await Service.findByIdAndDelete(id);
     if (!result) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Service not found.');
     }
     unlinkFile(result.image!);

     // use hard delete many
     await Faq.deleteMany({ refferenceId: id });

     // Step 2: Remove service from service category
     if (result.serviceCategory) {
          await ServiceCategory.findByIdAndUpdate(result.serviceCategory, { $pull: { services: result._id } });
     }

     return result;
};

const getServiceById = async (id: string): Promise<IService | null> => {
     const result = await Service.findById(id).populate('serviceCategory', 'name').populate('faqs', 'question answer');
     if (!result) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Service not found.');
     }
     return result;
};

const getAllServicesByServiceCategoryId = async (serviceCategoryId: string, query: Record<string, any>): Promise<{ meta: { total: number; page: number; limit: number }; result: IService[] }> => {
     const queryBuilder = new QueryBuilder(Service.find({ serviceCategory: serviceCategoryId }).populate('serviceCategory', 'name').populate('faqs', 'question answer'), query);
     const result = await queryBuilder.search(['name', 'description', 'serviceCategory.name']).filter().sort().paginate().fields().modelQuery;
     if (!result) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Service not found.');
     }
     const meta = await queryBuilder.countTotal();
     return { meta, result };
};

export const ServiceService = {
     createService,
     getAllServices,
     getAllUnpaginatedServices,
     updateService,
     deleteService,
     hardDeleteService,
     getServiceById,
     getAllServicesByServiceCategoryId,
};
