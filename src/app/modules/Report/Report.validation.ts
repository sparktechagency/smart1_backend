import { z } from 'zod';
import { ReportType } from './Report.enum';
// description
// type
// refferenceId
// image
const createReportZodSchema = z.object({
     body: z.object({
          images: z.array(z.string()).optional(),
          description: z.string({ required_error: 'Description is required' }),
          type: z.nativeEnum(ReportType, { required_error: 'Type is required' }),
          refferenceId: z.string({ required_error: 'Refference ID is required' }).optional(),
     }),
});

const updateReportZodSchema = z.object({
     body: z.object({
          images: z.array(z.string()).optional(),
          description: z.string().optional(),
          type: z.nativeEnum(ReportType).optional(),
          refferenceId: z.string().optional(),
     }),
});

export const ReportValidation = {
     createReportZodSchema,
     updateReportZodSchema
};
