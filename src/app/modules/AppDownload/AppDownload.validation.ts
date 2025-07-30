import { z } from 'zod';

const createAppDownloadZodSchema = z.object({
     body: z.object({
          deviceType: z.enum(['ios', 'android'], {
               required_error: 'Device type is required',
          }),
          ipAddress: z.string().optional(),
          userAgent: z.string().optional(),
     }),
});

const updateAppDownloadZodSchema = z.object({
     body: z.object({
          deviceType: z.enum(['ios', 'android']).optional(),
          ipAddress: z.string().optional(),
          userAgent: z.string().optional(),
     }),
});

export const AppDownloadValidation = {
     createAppDownloadZodSchema,
     updateAppDownloadZodSchema
};
