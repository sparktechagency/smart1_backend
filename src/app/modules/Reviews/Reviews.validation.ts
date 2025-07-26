import { z } from 'zod';
import { objectIdSchemaOptional } from '../user/user.validation';
import { ReviewsType } from './Reviews.enum';

const createReviewsZodSchema = z.object({
     body: z.object({
          rating: z.number({ required_error: 'Rating is required' }),
          review: z.string({ required_error: 'Review is required' }),
          type: z.nativeEnum(ReviewsType, { required_error: 'Type is required' }),
          refferenceId: objectIdSchemaOptional,
     }),
});

const updateReviewsZodSchema = z.object({
     body: z.object({
          rating: z.number().optional(),
          review: z.string().optional(),
          type: z.nativeEnum(ReviewsType, { required_error: 'Type is required' }),
          refferenceId: objectIdSchemaOptional,
     }),
});

export const ReviewsValidation = {
     createReviewsZodSchema,
     updateReviewsZodSchema
};
