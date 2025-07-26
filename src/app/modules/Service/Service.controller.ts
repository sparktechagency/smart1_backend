import { Request, Response } from 'express';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { IService } from './Service.interface';
import { ServiceService } from './Service.service';

const createService = catchAsync(async (req: Request, res: Response) => {
     const result = await ServiceService.createService(req.body);

     sendResponse<IService>(res, {
          statusCode: 200,
          success: true,
          message: 'Service created successfully',
          data: result,
     });
});

const getAllServices = catchAsync(async (req: Request, res: Response) => {
     const result = await ServiceService.getAllServices(req.query);

     sendResponse<{ meta: { total: number; page: number; limit: number; }; result: IService[]; }>(res, {
          statusCode: 200,
          success: true,
          message: 'Services retrieved successfully',
          data: result,
     });
});

const getAllUnpaginatedServices = catchAsync(async (req: Request, res: Response) => {
     const result = await ServiceService.getAllUnpaginatedServices();

     sendResponse<IService[]>(res, {
          statusCode: 200,
          success: true,
          message: 'Services retrieved successfully',
          data: result,
     });
});

const updateService = catchAsync(async (req: Request, res: Response) => {
     const { id } = req.params;
     const result = await ServiceService.updateService(id, req.body);

     sendResponse<IService>(res, {
          statusCode: 200,
          success: true,
          message: 'Service updated successfully',
          data: result || undefined,
     });
});

const deleteService = catchAsync(async (req: Request, res: Response) => {
     const { id } = req.params;
     const result = await ServiceService.deleteService(id);

     sendResponse<IService>(res, {
          statusCode: 200,
          success: true,
          message: 'Service deleted successfully',
          data: result || undefined,
     });
});

const hardDeleteService = catchAsync(async (req: Request, res: Response) => {
     const { id } = req.params;
     const result = await ServiceService.hardDeleteService(id);

     sendResponse<IService>(res, {
          statusCode: 200,
          success: true,
          message: 'Service deleted successfully',
          data: result || undefined,
     });
});

const getServiceById = catchAsync(async (req: Request, res: Response) => {
     const { id } = req.params;
     const result = await ServiceService.getServiceById(id);

     sendResponse<IService>(res, {
          statusCode: 200,
          success: true,
          message: 'Service retrieved successfully',
          data: result || undefined,
     });
});

export const ServiceController = {
     createService,
     getAllServices,
     getAllUnpaginatedServices,
     updateService,
     deleteService,
     hardDeleteService,
     getServiceById
};
