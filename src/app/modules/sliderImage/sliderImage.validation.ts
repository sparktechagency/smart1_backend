import { z } from 'zod';
const createSliderImageZodSchema = z.object({
    body: z.object({
        image: z.string({ required_error: 'Image is required' }),
        altText: z.string({ required_error: 'Alt text is required' }),
    }),
});

const updateSliderImageZodSchema = z.object({
    body: z.object({
        image: z.string().optional(),
        altText: z.string().optional(),
    }),
});

export const SliderImageValidation = {
    createSliderImageZodSchema,
    updateSliderImageZodSchema
}