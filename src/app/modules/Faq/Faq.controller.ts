import { Request, Response } from 'express';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { IJwtPayload } from '../auth/auth.interface';
import { IFaq } from './Faq.interface';
import { FaqService } from './Faq.service';

const createFaq = catchAsync(async (req: Request, res: Response) => {
     const result = await FaqService.createFaq(req.body, req.user as IJwtPayload);

     sendResponse<IFaq>(res, {
          statusCode: 200,
          success: true,
          message: 'Faq created successfully',
          data: result,
     });
});

const getAllFaqsByType = catchAsync(async (req: Request, res: Response) => {
     const result = await FaqService.getAllFaqsByType(req.query, req.params.type);

     sendResponse<{ meta: { total: number; page: number; limit: number; }; result: IFaq[]; }>(res, {
          statusCode: 200,
          success: true,
          message: 'Faqs retrieved successfully',
          data: result,
     });
});

const getAllUnpaginatedFaqsByType = catchAsync(async (req: Request, res: Response) => {
     const result = await FaqService.getAllUnpaginatedFaqsByType(req.params.type);

     sendResponse<IFaq[]>(res, {
          statusCode: 200,
          success: true,
          message: 'Faqs retrieved successfully',
          data: result,
     });
});

const updateFaq = catchAsync(async (req: Request, res: Response) => {
     const { id } = req.params;
     const result = await FaqService.updateFaq(id, req.body);

     sendResponse<IFaq>(res, {
          statusCode: 200,
          success: true,
          message: 'Faq updated successfully',
          data: result || undefined,
     });
});

const deleteFaq = catchAsync(async (req: Request, res: Response) => {
     const { id } = req.params;
     const result = await FaqService.deleteFaq(id);

     sendResponse<IFaq>(res, {
          statusCode: 200,
          success: true,
          message: 'Faq deleted successfully',
          data: result || undefined,
     });
});

const hardDeleteFaq = catchAsync(async (req: Request, res: Response) => {
     const { id } = req.params;
     const result = await FaqService.hardDeleteFaq(id);

     sendResponse<IFaq>(res, {
          statusCode: 200,
          success: true,
          message: 'Faq deleted successfully',
          data: result || undefined,
     });
});

const getFaqById = catchAsync(async (req: Request, res: Response) => {
     const { id } = req.params;
     const result = await FaqService.getFaqById(id);

     sendResponse<IFaq>(res, {
          statusCode: 200,
          success: true,
          message: 'Faq retrieved successfully',
          data: result || undefined,
     });
});

const getAllFaqsByServiceId = catchAsync(async (req: Request, res: Response) => {
     const { serviceId } = req.params;
     const result = await FaqService.getAllFaqsByServiceId(serviceId, req.query);

     sendResponse<{ meta: { total: number; page: number; limit: number; }; result: IFaq[]; }>(res, {
          statusCode: 200,
          success: true,
          message: 'Faqs retrieved successfully',
          data: result || undefined,
     });
});

export const FaqController = {
     createFaq,
     getAllFaqsByType,
     getAllUnpaginatedFaqsByType,
     updateFaq,
     deleteFaq,
     hardDeleteFaq,
     getFaqById,
     getAllFaqsByServiceId
};
