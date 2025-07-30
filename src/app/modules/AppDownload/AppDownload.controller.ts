import { Request, Response } from 'express';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { IAppDownload } from './AppDownload.interface';
import { AppDownloadService } from './AppDownload.service';
import { IJwtPayload } from '../auth/auth.interface';

const createAppDownload = catchAsync(async (req: Request, res: Response) => {
     const result = await AppDownloadService.createAppDownload(req.body, req.user as IJwtPayload);

     sendResponse<IAppDownload>(res, {
          statusCode: 200,
          success: true,
          message: 'AppDownload created successfully',
          data: result,
     });
});

const getAllAppDownloads = catchAsync(async (req: Request, res: Response) => {
     const result = await AppDownloadService.getAllAppDownloads(req.query);

     sendResponse<{ meta: { total: number; page: number; limit: number; }; result: IAppDownload[]; }>(res, {
          statusCode: 200,
          success: true,
          message: 'AppDownloads retrieved successfully',
          data: result,
     });
});

const getAllUnpaginatedAppDownloads = catchAsync(async (req: Request, res: Response) => {
     const result = await AppDownloadService.getAllUnpaginatedAppDownloads();

     sendResponse<IAppDownload[]>(res, {
          statusCode: 200,
          success: true,
          message: 'AppDownloads retrieved successfully',
          data: result,
     });
});

const updateAppDownload = catchAsync(async (req: Request, res: Response) => {
     const { id } = req.params;
     const result = await AppDownloadService.updateAppDownload(id, req.body);

     sendResponse<IAppDownload>(res, {
          statusCode: 200,
          success: true,
          message: 'AppDownload updated successfully',
          data: result || undefined,
     });
});

const deleteAppDownload = catchAsync(async (req: Request, res: Response) => {
     const { id } = req.params;
     const result = await AppDownloadService.deleteAppDownload(id);

     sendResponse<IAppDownload>(res, {
          statusCode: 200,
          success: true,
          message: 'AppDownload deleted successfully',
          data: result || undefined,
     });
});

const hardDeleteAppDownload = catchAsync(async (req: Request, res: Response) => {
     const { id } = req.params;
     const result = await AppDownloadService.hardDeleteAppDownload(id);

     sendResponse<IAppDownload>(res, {
          statusCode: 200,
          success: true,
          message: 'AppDownload deleted successfully',
          data: result || undefined,
     });
});

const getAppDownloadById = catchAsync(async (req: Request, res: Response) => {
     const { id } = req.params;
     const result = await AppDownloadService.getAppDownloadById(id);

     sendResponse<IAppDownload>(res, {
          statusCode: 200,
          success: true,
          message: 'AppDownload retrieved successfully',
          data: result || undefined,
     });
});

export const AppDownloadController = {
     createAppDownload,
     getAllAppDownloads,
     getAllUnpaginatedAppDownloads,
     updateAppDownload,
     deleteAppDownload,
     hardDeleteAppDownload,
     getAppDownloadById
};
