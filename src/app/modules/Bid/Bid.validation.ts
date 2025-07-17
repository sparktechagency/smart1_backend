import { z } from 'zod';
import { DEFAULT_ADMIN_REVENUE } from './Bid.enum';

const createBidZodSchema = z.object({
     body: z.object({
          rate: z.number({ required_error: 'Rate is required' }),
          booking: z.string({ required_error: 'Booking is required' }).optional()
     }),
});

const updateBidZodSchema = z.object({
     body: z.object({
          rate: z.number().optional(),
          booking: z.string().optional()
     }),
});

export const BidValidation = {
     createBidZodSchema,
     updateBidZodSchema
};
