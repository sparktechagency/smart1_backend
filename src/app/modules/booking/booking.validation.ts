import { Types } from 'mongoose';
import { z } from 'zod';
import { objectIdSchemaMendatory, objectIdSchemaOptional } from '../user/user.validation';
import { BOOKING_STATUS, CANCELL_OR_REFUND_REASON, PAYMENT_METHOD, PAYMENT_STATUS } from './booking.enums';

// Validation schema for order product
const bookingServiceSchema = z.object({
  service: z.string().refine((val) => Types.ObjectId.isValid(val), {
    message: 'Invalid service ID',
  }),
  quantity: z.number().int().positive('Quantity must be a positive number')
});

// Validation schema for creating an order
export const createBookingSchema = z.object({
  body: z.object({
    serviceCategory: objectIdSchemaMendatory('serviceCategory'),
    acceptedBid: objectIdSchemaMendatory('acceptedBid').optional(),
    services: z
      .array(bookingServiceSchema)
      .min(1, 'At least one service is required')
      .max(10, 'At most 10 services are allowed'),
    coupon: z
      .string()
      .optional()
      .nullable(),
    geoLocationOfDestination: z.object({
      type: z.string(),
      coordinates: z.array(z.number()),
    }).optional(),
    images: z.array(z.string()),
    bookingDate: z.union([z.date(), z.string()]),
    bookingTime: z.union([z.date(), z.string()]),
    serviceTaskDetails: z.string(),
    serviceTaskAdditionalInfo: z.string(),
    servicingDestination: z.string(),
    paymentMethod: z.nativeEnum(PAYMENT_METHOD, {
      required_error: 'Payment method is required',
      invalid_type_error: 'Invalid payment method',
    }),
    reports: z.array(objectIdSchemaOptional).optional(),
  }),
});

// Validation schema for updating order status
export const updateBookingStatusSchema = z.object({
  body: z.object({
    status: z.nativeEnum(BOOKING_STATUS, {
      required_error: 'Status is required',
      invalid_type_error: 'Invalid status',
    }),
  }),
});

// Validation schema for updating payment status
export const updatePaymentStatusSchema = z.object({
  body: z.object({
    paymentStatus: z.nativeEnum(PAYMENT_STATUS, {
      required_error: 'Payment status is required',
      invalid_type_error: 'Invalid payment status',
    }),
  }),
});

export const acceptBidForBookingSchema = z.object({
  body: z.object({
    bidId: objectIdSchemaMendatory('bidId'),
  }),
});

export const cancelBookingSchema = z.object({
  body: z.object({
    bookingCancelReason: z.nativeEnum(CANCELL_OR_REFUND_REASON, {
      required_error: 'Booking cancel reason is required',
      invalid_type_error: 'Invalid booking cancel reason',
    }),
  }),
});

export const BookingValidation = {
  createBookingSchema,
  updateBookingStatusSchema,
  updatePaymentStatusSchema,
  acceptBidForBookingSchema,
  cancelBookingSchema
}