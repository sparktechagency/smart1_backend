import { z } from 'zod';
import { CANCELL_OR_REFUND_REASON } from '../booking/booking.enums';
import { BID_STATUS } from './Bid.enum';

const createBidZodSchema = z.object({
     body: z.object({
          rate: z.number({ required_error: 'Rate is required' }),
          booking: z.string({ required_error: 'Booking is required' })
     }),
});

const updateRateBidZodSchema = z.object({
     body: z.object({
          rate: z.number().optional()
     }),
});

const changeBidStatusZodSchema = z.object({
     body: z.object({
          status: z.nativeEnum(BID_STATUS, { required_error: 'Status is required' }),
     }),
});

const cancelBidZodSchema = z.object({
     body: z.object({
          reason: z.nativeEnum(CANCELL_OR_REFUND_REASON, { required_error: 'Reason is required' }),
     }),
});

export const BidValidation = {
     createBidZodSchema,
     updateRateBidZodSchema,
     changeBidStatusZodSchema,
     cancelBidZodSchema
};
