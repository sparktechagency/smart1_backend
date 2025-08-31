import { StatusCodes } from 'http-status-codes';
import AppError from '../../../errors/AppError';
import unlinkFile from '../../../shared/unlinkFile';
import QueryBuilder from '../../builder/QueryBuilder';
import { Faq } from '../Faq/Faq.model';
import { ServiceCategory } from '../ServiceCategory/ServiceCategory.model';
import { IService } from './Service.interface';
import { Service } from './Service.model';
import { FAQType } from '../Faq/Faq.enum';

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
          isExistFaqs = await Faq.find({ _id: { $in: payload.faqs }, type: FAQType.SERVICE, refferenceId:null });
          if (!isExistFaqs || isExistFaqs.length !== payload.faqs.length) {
               unlinkFile(payload.image!);
               throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid faq ids.');
          }
     }
     const result = await Service.create(payload);
     if (!result) {
          unlinkFile(payload.image!);
          throw new AppError(StatusCodes.BAD_REQUEST, 'Service not created.');
     }
     isExistServiceCategory.services?.push(result._id);
     await isExistServiceCategory.save();

     // update faqs
     if (payload.faqs) {
          await Faq.updateMany({ _id: { $in: payload.faqs }, refferenceId:null, type: FAQType.SERVICE }, { $set: { refferenceId: result._id, type: FAQType.SERVICE } });
     }
     return result;
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
     if (payload.faqs) {
          // make the olds faqs null
          await Faq.updateMany({ refferenceId: id }, { $set: { refferenceId: null } });
          // update the new faqs
          await Faq.updateMany({ _id: { $in: payload.faqs }, refferenceId:null, type: FAQType.SERVICE }, { $set: { refferenceId: id, type: FAQType.SERVICE } });
     }

     unlinkFile(isExistService.image!); // Unlink the old image
     return await Service.findByIdAndUpdate(id, payload, { new: true });
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
