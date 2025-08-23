import { z } from 'zod';
import { ReportCategoryType, ReportStatus, ReportType } from './Report.enum';
// description
// type
// refferenceId
// image
const createReportZodSchema = z.object({
     body: z.object({
          images: z.array(z.string()).optional(),
          description: z.string({ required_error: 'Description is required' }),
          type: z.nativeEnum(ReportType, { required_error: 'Type is required' }),
          report_type: z.string({ required_error: 'Report Type is required' }),
          refferenceId: z.string({ required_error: 'Refference ID is required' }).optional(),
          categoryType: z.nativeEnum(ReportCategoryType, { required_error: 'Category Type is required' }),
          status: z.nativeEnum(ReportStatus, { required_error: 'Status is required' }),
     }),
});

const updateReportZodSchema = z.object({
     body: z.object({
          images: z.array(z.string()).optional(),
          description: z.string().optional(),
          type: z.nativeEnum(ReportType).optional(),
          report_type: z.string().optional(),
          refferenceId: z.string().optional(),
          categoryType: z.nativeEnum(ReportCategoryType).optional(),
          status: z.nativeEnum(ReportStatus).optional(),
     }),
});

const changeReportStatusZodSchema = z.object({
     body: z.object({
          status: z.nativeEnum(ReportStatus, { required_error: 'Status is required' }),
     }),
});

export const ReportValidation = {
     createReportZodSchema,
     updateReportZodSchema,
     changeReportStatusZodSchema,
};
