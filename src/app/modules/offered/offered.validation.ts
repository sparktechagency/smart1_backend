import { z } from "zod";
import { objectIdSchema } from "../user/user.validation";

const createOfferSchema = z.object({
    body: z.object({
        services: z.array(objectIdSchema).min(1),
        discountPercentage: z.number().min(0).max(100),
    })
})

const deleteOfferSchema = z.object({
    body: z.object({
        offers: z.array(objectIdSchema).min(1),
    })
})

export const OfferedValidation = {
    createOfferSchema,
    deleteOfferSchema
}