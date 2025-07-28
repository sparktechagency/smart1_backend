import { z } from 'zod';

const createPaymentCardZodSchema = z.object({
     body: z.object({
          cvvNo: z.string({ required_error: 'CVV number is required' }),
          cardExpiryDate: z.string({ required_error: 'Card expiry date is required' }),
          cardNo: z.string({ required_error: 'Card number is required' }),
          description: z.string({ required_error: 'Description is required' }),
     }),
});

const updatePaymentCardZodSchema = z.object({
     body: z.object({
          cvvNo: z.string().optional(),
          cardExpiryDate: z.string().optional(),
          description: z.string().optional(),
     }),
});

export const paymentCardValidation = {
     createPaymentCardZodSchema,
     updatePaymentCardZodSchema,

};
