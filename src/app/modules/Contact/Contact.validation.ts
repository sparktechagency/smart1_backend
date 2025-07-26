import { z } from 'zod';

const createContactZodSchema = z.object({
     body: z.object({
          phone: z.string({ required_error: 'Phone is required' }),
          email: z.string({ required_error: 'Email is required' }),
          address: z.string({ required_error: 'Address is required' }),
     }),
});

const updateContactZodSchema = z.object({
     body: z.object({
          image: z.string().optional(),
          altText: z.string().optional(),
     }),
});

export const ContactValidation = {
     createContactZodSchema,
     updateContactZodSchema
};
