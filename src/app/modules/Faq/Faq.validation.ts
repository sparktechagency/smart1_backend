import { z } from 'zod';
import { FAQType } from './Faq.enum';
import { objectIdSchema } from '../user/user.validation';

const createFaqZodSchema = z.object({
     body: z.object({
          question: z.string({ required_error: 'Question is required' }),
          answer: z.string({ required_error: 'Answer is required' }),
          type: z.nativeEnum(FAQType, { required_error: 'Type is required' }),
          refferenceId: objectIdSchema,   
     }),
});

const updateFaqZodSchema = z.object({
     body: z.object({
          question: z.string().optional(),
          answer: z.string().optional(),
          type: z.nativeEnum(FAQType, { required_error: 'Type is required' }),
          refferenceId: objectIdSchema.optional(),   
     }),
});

export const FaqValidation = {
     createFaqZodSchema,
     updateFaqZodSchema
};
