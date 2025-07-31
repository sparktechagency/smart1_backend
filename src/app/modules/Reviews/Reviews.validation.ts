import { z } from 'zod';
import { objectIdSchemaOptional } from '../user/user.validation';
import { ReviewsType } from './Reviews.enum';

const createReviewsZodSchema = z.object({
     body: z.object({
          rating: z.number({ required_error: 'Rating is required' }).min(1, 'Rating must be between 1 and 5').max(5, 'Rating must be between 1 and 5'),
          review: z.string({ required_error: 'Review is required' }),
          type: z.nativeEnum(ReviewsType, { required_error: 'Type is required' }),
          refferenceId: objectIdSchemaOptional,
     }),
});

const updateReviewsZodSchema = z.object({
     body: z.object({
          rating: z.number().min(1, 'Rating must be between 1 and 5').max(5, 'Rating must be between 1 and 5').optional(),
          review: z.string().optional(),
          type: z.nativeEnum(ReviewsType, { required_error: 'Type is required' }),
          refferenceId: objectIdSchemaOptional,
     }),
});

export const ReviewsValidation = {
     createReviewsZodSchema,
     updateReviewsZodSchema
};
