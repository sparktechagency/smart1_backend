import { z } from 'zod';
import { objectIdSchema } from '../user/user.validation';
const createServiceZodSchema = z.object({
     body: z.object({
          name: z.string({ required_error: 'Name is required' }),
          serviceCategory: objectIdSchema,
          image: z.string({ required_error: 'Image is required' }),
          serviceCharge: z.number({ required_error: 'Service charge is required' }),
          description: z.string().optional(),
          whatsIncluded: z.string().optional(),
          whyChooseUs: z.string().optional(),
          faqs: z.array(objectIdSchema).optional(),
     }),
});

const updateServiceZodSchema = z.object({
     body: z.object({
          name: z.string().optional(),
          serviceCategory: objectIdSchema,
          image: z.string().optional(),
          serviceCharge: z.number().optional(),
          description: z.string().optional(),
          whatsIncluded: z.string().optional(),
          whyChooseUs: z.string().optional(),
          faqs: z.array(objectIdSchema).optional(),
     }),
});

export const ServiceValidation = {
     createServiceZodSchema,
     updateServiceZodSchema
};
