import { Request, Response } from 'express';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { IServiceCategory } from './ServiceCategory.interface';
import { ServiceCategoryService } from './ServiceCategory.service';

const createServiceCategory = catchAsync(async (req: Request, res: Response) => {
     const result = await ServiceCategoryService.createServiceCategory(req.body);

     sendResponse<IServiceCategory>(res, {
          statusCode: 200,
          success: true,
          message: 'ServiceCategory created successfully',
          data: result,
     });
});

const getAllServiceCategorys = catchAsync(async (req: Request, res: Response) => {
     const result = await ServiceCategoryService.getAllServiceCategorys(req.query);

     sendResponse<{ meta: { total: number; page: number; limit: number; }; result: IServiceCategory[]; }>(res, {
          statusCode: 200,
          success: true,
          message: 'ServiceCategorys retrieved successfully',
          data: result,
     });
});

const getAllUnpaginatedServiceCategorys = catchAsync(async (req: Request, res: Response) => {
     const result = await ServiceCategoryService.getAllUnpaginatedServiceCategorys();

     sendResponse<IServiceCategory[]>(res, {
          statusCode: 200,
          success: true,
          message: 'ServiceCategorys retrieved successfully',
          data: result,
     });
});

const updateServiceCategory = catchAsync(async (req: Request, res: Response) => {
     const { id } = req.params;
     const result = await ServiceCategoryService.updateServiceCategory(id, req.body);

     sendResponse<IServiceCategory>(res, {
          statusCode: 200,
          success: true,
          message: 'ServiceCategory updated successfully',
          data: result || undefined,
     });
});

const deleteServiceCategory = catchAsync(async (req: Request, res: Response) => {
     const { id } = req.params;
     const result = await ServiceCategoryService.deleteServiceCategory(id);

     sendResponse<IServiceCategory>(res, {
          statusCode: 200,
          success: true,
          message: 'ServiceCategory deleted successfully',
          data: result || undefined,
     });
});

const hardDeleteServiceCategory = catchAsync(async (req: Request, res: Response) => {
     const { id } = req.params;
     const result = await ServiceCategoryService.hardDeleteServiceCategory(id);

     sendResponse<IServiceCategory>(res, {
          statusCode: 200,
          success: true,
          message: 'ServiceCategory deleted successfully',
          data: result || undefined,
     });
});

export const ServiceCategoryController = {
     createServiceCategory,
     getAllServiceCategorys,
     getAllUnpaginatedServiceCategorys,
     updateServiceCategory,
     deleteServiceCategory,
     hardDeleteServiceCategory
};
