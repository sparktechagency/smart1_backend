import { StatusCodes } from 'http-status-codes';
import AppError from '../../../errors/AppError';
import { IService } from './Service.interface';
import { Service } from './Service.model';
import { ServiceCategory } from '../ServiceCategory/ServiceCategory.model';
import QueryBuilder from '../../builder/QueryBuilder';
import unlinkFile from '../../../shared/unlinkFile';
import { Faq } from '../Faq/Faq.model';

const createService = async (payload: IService): Promise<IService> => {
     // check is exist serviceCategory 
     const isExistServiceCategory = await ServiceCategory.findById(payload.serviceCategory);
     if (!isExistServiceCategory) {
          unlinkFile(payload.image!);
          throw new AppError(StatusCodes.NOT_FOUND, 'Service category not found.');
     }
     const result = await Service.create(payload);
     return result;
};

const getAllServices = async (query: Record<string, any>): Promise<{ meta: { total: number; page: number; limit: number; }; result: IService[]; }> => {
     const queryBuilder = new QueryBuilder(Service.find().populate('serviceCategory', 'name').populate('faqs', 'question answer'), query);
     const result = await queryBuilder.filter().sort().paginate().fields().modelQuery;
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
               $set: { isDeleted: true, deletedAt: new Date() }
          }
     );

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

     return result;
};

const getServiceById = async (id: string): Promise<IService | null> => {
     const result = await Service.findById(id).populate('serviceCategory', 'name').populate('faqs', 'question answer');
     if (!result) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Service not found.');
     }
     return result;
};

export const ServiceService = {
     createService,
     getAllServices,
     getAllUnpaginatedServices,
     updateService,
     deleteService,
     hardDeleteService,
     getServiceById
};
