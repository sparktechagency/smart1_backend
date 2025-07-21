import { string, z } from 'zod';
import { USER_ROLES } from './user.enums';
export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, { message: 'Invalid ObjectId' }).optional();
export const objectIdSchemaMendatory = (fieldName: string) => z.string().regex(/^[a-f\d]{24}$/i, { message: `Invalid ${fieldName} Id` });
export const createUserZodSchema = z.object({
     body: z.object({
          full_name: z.string({ required_error: 'Name is required' }).min(2, 'Name must be at least 2 characters long'),
          email: z.string({ required_error: 'Email is required' }).email('Invalid email address'),
          password: z.string({ required_error: 'Password is required' }).min(8, 'Password must be at least 8 characters long'),
          phone: string().default('').optional(),
     }),
});
export const createServiceProviderZodSchema = z.object({
     body: z.object({
          email: z.string({ required_error: 'Email is required' }).email('Invalid email address'),
          password: z.string({ required_error: 'Password is required' }).min(8, 'Password must be at least 8 characters long'),
          full_name: z.string({ required_error: 'Name is required' }).min(2, 'Name must be at least 2 characters long'),
          businessName: z.string().min(2, 'Business Name must be at least 2 characters long'),
          serviceCategory: z.string(),
          phone: string().default(''),
     }),
});

const updateUserZodSchema = z.object({
     body: z.object({
          full_name: z.string().optional(),
          businessName: z.string().min(2, 'Business Name must be at least 2 characters long').optional(), // for provider
          serviceCategory: z.string().optional(), // for provider
          phone: z.string().optional(),
          address: z
               .union([
                    z.string(),
                    z.object({
                         province: z.string().optional(),
                         territory: z.string().optional(),
                         city: z.string().optional(),
                         country: z.string().optional(),
                         detail_address: z.string().optional(),
                    }),
               ])
               .optional(),
          email: z.string().email('Invalid email address').optional(),
          password: z.string().optional(),
          image: z.string().optional(),
     }),
});

const updateUserByIdZodSchema = z.object({
     body: z.object({
          role: z.nativeEnum(USER_ROLES).optional(),
          status: z.enum(['active', 'blocked']).optional(),
          verified: z.boolean().optional(),
     }),
});

const createAdminZodSchema = z.object({
     body: z.object({
          full_name: z.string({ required_error: 'Name is required' }).min(2, 'Name must be at least 2 characters long'),
          email: z.string({ required_error: 'Email is required' }).email('Invalid email address'),
          password: z.string({ required_error: 'Password is required' }).min(8, 'Password must be at least 8 characters long'),
     }),
});

export const UserValidation = {
     createUserZodSchema,
     createServiceProviderZodSchema,
     updateUserZodSchema,
     updateUserByIdZodSchema,
     createAdminZodSchema,
};
