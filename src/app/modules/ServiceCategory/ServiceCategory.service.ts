import { StatusCodes } from 'http-status-codes';
import AppError from '../../../errors/AppError';
import { IServiceCategory } from './ServiceCategory.interface';
import { ServiceCategory } from './ServiceCategory.model';
import QueryBuilder from '../../builder/QueryBuilder';
import unlinkFile from '../../../shared/unlinkFile';
import { Service } from '../Service/Service.model';

const createServiceCategory = async (payload: IServiceCategory): Promise<IServiceCategory> => {
     const result = await ServiceCategory.create(payload);
     return result;
};

const getAllServiceCategorys = async (query: Record<string, any>): Promise<{ meta: { total: number; page: number; limit: number; }; result: IServiceCategory[]; }> => {
     const queryBuilder = new QueryBuilder(ServiceCategory.find(), query);
     const result = await queryBuilder.filter().sort().paginate().fields().modelQuery;
     const meta = await queryBuilder.countTotal();
     return { meta, result };
};

const getAllUnpaginatedServiceCategorys = async (): Promise<IServiceCategory[]> => {
     const result = await ServiceCategory.find();
     return result;
};

const updateServiceCategory = async (id: string, payload: Partial<IServiceCategory>): Promise<IServiceCategory | null> => {
     const isExist = await ServiceCategory.findById(id);
     if (!isExist) {
          unlinkFile(payload.logo!);
          throw new AppError(StatusCodes.NOT_FOUND, 'ServiceCategory not found.');
     }

     unlinkFile(isExist.logo!); // Unlink the old image
     return await ServiceCategory.findByIdAndUpdate(id, payload, { new: true });
};

const deleteServiceCategory = async (id: string): Promise<IServiceCategory | null> => {
     const result = await ServiceCategory.findById(id);
     if (!result) {
          throw new AppError(StatusCodes.NOT_FOUND, 'ServiceCategory not found.');
     }
     // check if any service exis of this service category then throw error
     const serviceCount = await Service.countDocuments({ serviceCategory: id });
     if (serviceCount > 0) {
          throw new AppError(StatusCodes.BAD_REQUEST, 'ServiceCategory has services.');
     }
     result.isDeleted = true;
     result.deletedAt = new Date();
     await result.save();
     return result;
};

const hardDeleteServiceCategory = async (id: string): Promise<IServiceCategory | null> => {
     const result = await ServiceCategory.findByIdAndDelete(id);
     if (!result) {
          throw new AppError(StatusCodes.NOT_FOUND, 'ServiceCategory not found.');
     }
     // check if any service exis of this service category then throw error
     const serviceCount = await Service.countDocuments({ serviceCategory: id });
     if (serviceCount > 0) {
          throw new AppError(StatusCodes.BAD_REQUEST, 'ServiceCategory has services.');
     }
     unlinkFile(result.logo!);
     return result;
};

export const ServiceCategoryService = {
     createServiceCategory,
     getAllServiceCategorys,
     getAllUnpaginatedServiceCategorys,
     updateServiceCategory,
     deleteServiceCategory,
     hardDeleteServiceCategory
};
