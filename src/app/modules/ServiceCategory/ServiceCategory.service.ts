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

const getAllServiceCategorys = async (
     query: Record<string, any>,
): Promise<{ meta: { total: number; page: number; limit: number }; result: Array<IServiceCategory & { serviceCount: number; priceRange: { lowest: number; highest: number } }> }> => {
     // First get the paginated categories
     const queryBuilder = new QueryBuilder(ServiceCategory.find().populate('services', 'name serviceCharge description image'), query);
     const categories = await queryBuilder.filter().sort().paginate().fields().modelQuery;
     const meta = await queryBuilder.countTotal();

     // Get category IDs for the current page
     const categoryIds = categories.map((cat) => cat._id);

     // Get service counts and price ranges for these categories
     const serviceStats = await Service.aggregate([
          {
               $match: {
                    serviceCategory: { $in: categoryIds },
                    isDeleted: false,
               },
          },
          {
               $group: {
                    _id: '$serviceCategory',
                    serviceCount: { $sum: 1 },
                    minPrice: { $min: '$serviceCharge' },
                    maxPrice: { $max: '$serviceCharge' },
               },
          },
     ]);

     // Create a map for quick lookup
     const statsMap = new Map(
          serviceStats.map((stat) => [
               stat._id.toString(),
               {
                    serviceCount: stat.serviceCount,
                    priceRange: {
                         lowest: stat.minPrice || 0,
                         highest: stat.maxPrice || 0,
                    },
               },
          ]),
     );

     // Merge the stats with the categories
     const result = categories.map((category) => ({
          ...category.toObject(),
          serviceCount: statsMap.get(category._id.toString())?.serviceCount || 0,
          priceRange: statsMap.get(category._id.toString())?.priceRange || { lowest: 0, highest: 0 },
     }));

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
     const serviceCount = await Service.countDocuments({ serviceCategory: id, isDeleted: false });
     console.log('🚀 ~ deleteServiceCategory ~ serviceCount:', serviceCount);
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

const getServiceCategoryById = async (id: string): Promise<IServiceCategory | null> => {
     const result = await ServiceCategory.findById(id).populate('services', 'name serviceCharge description image');
     if (!result) {
          throw new AppError(StatusCodes.NOT_FOUND, 'ServiceCategory not found.');
     }
     return result;
};

export const ServiceCategoryService = {
     createServiceCategory,
     getAllServiceCategorys,
     getAllUnpaginatedServiceCategorys,
     updateServiceCategory,
     deleteServiceCategory,
     hardDeleteServiceCategory,
     getServiceCategoryById,
};
