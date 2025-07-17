import { z } from 'zod';
import { PAYMENT_METHOD } from '../booking/booking.enums';

const createPaymentZodSchema = z.object({
     body: z.object({
          booking: z.string({ required_error: 'Booking is required' }),
          serviceCategory: z.string({ required_error: 'Service category is required' }),
          method: z.enum([...Object.values(PAYMENT_METHOD)] as [string, ...string[]]),
          transactionId: z.string({ required_error: 'Transaction ID is required' }),
          amount: z.number({ required_error: 'Amount is required' }),
     }),
});

const updatePaymentZodSchema = z.object({
     body: z.object({
          image: z.string().optional(),
          altText: z.string().optional(),
     }),
});

export const PaymentValidation = {
     createPaymentZodSchema,
     updatePaymentZodSchema
};
