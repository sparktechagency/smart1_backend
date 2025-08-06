import { z } from 'zod';
import { ImageType } from './image.enum';
const createImageZodSchema = z.object({
     body: z.object({
          image: z.string({ required_error: 'Image is required' }).optional(),
          logo: z.string({ required_error: 'Logo is required' }).optional(),
          altText: z.string({ required_error: 'Alt text is required' }),
          title: z.string({ required_error: 'title text is required' }),
          description: z.string({ required_error: 'description text is required' }),
          imageType: z.nativeEnum(ImageType, { required_error: 'Image type is required' }),
     }),
});

const updateImageZodSchema = z.object({
     body: z.object({
          image: z.string().optional(),
          logo: z.string().optional(),
          altText: z.string().optional(),
          title: z.string().optional(),
          description: z.string().optional(),
     }),
});

export const ImageValidation = {
     createImageZodSchema,
     updateImageZodSchema,
};
