import { Request, Response } from 'express';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { IReport } from './Report.interface';
import { ReportService } from './Report.service';
import { IJwtPayload } from '../auth/auth.interface';

const createReport = catchAsync(async (req: Request, res: Response) => {
     const result = await ReportService.createReport(req.body, req.user as IJwtPayload);

     sendResponse<IReport>(res, {
          statusCode: 200,
          success: true,
          message: 'Report created successfully',
          data: result,
     });
});

const getAllReports = catchAsync(async (req: Request, res: Response) => {
     const result = await ReportService.getAllReports(req.query);

     sendResponse<{ meta: { total: number; page: number; limit: number; }; result: IReport[]; }>(res, {
          statusCode: 200,
          success: true,
          message: 'Reports retrieved successfully',
          data: result,
     });
});

const getAllUnpaginatedReports = catchAsync(async (req: Request, res: Response) => {
     const result = await ReportService.getAllUnpaginatedReports();

     sendResponse<IReport[]>(res, {
          statusCode: 200,
          success: true,
          message: 'Reports retrieved successfully',
          data: result,
     });
});

const updateReport = catchAsync(async (req: Request, res: Response) => {
     const { id } = req.params;
     const result = await ReportService.updateReport(id, req.body);

     sendResponse<IReport>(res, {
          statusCode: 200,
          success: true,
          message: 'Report updated successfully',
          data: result || undefined,
     });
});

const deleteReport = catchAsync(async (req: Request, res: Response) => {
     const { id } = req.params;
     const result = await ReportService.deleteReport(id);

     sendResponse<IReport>(res, {
          statusCode: 200,
          success: true,
          message: 'Report deleted successfully',
          data: result || undefined,
     });
});

const hardDeleteReport = catchAsync(async (req: Request, res: Response) => {
     const { id } = req.params;
     const result = await ReportService.hardDeleteReport(id);

     sendResponse<IReport>(res, {
          statusCode: 200,
          success: true,
          message: 'Report deleted successfully',
          data: result || undefined,
     });
});

const getReportById = catchAsync(async (req: Request, res: Response) => {
     const { id } = req.params;
     const result = await ReportService.getReportById(id);

     sendResponse<IReport>(res, {
          statusCode: 200,
          success: true,
          message: 'Report retrieved successfully',
          data: result || undefined,
     });
});

export const ReportController = {
     createReport,
     getAllReports,
     getAllUnpaginatedReports,
     updateReport,
     deleteReport,
     hardDeleteReport,
     getReportById
};
