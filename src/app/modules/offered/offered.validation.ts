import { z } from "zod";
import { objectIdSchemaOptional } from "../user/user.validation";

const createOfferSchema = z.object({
    body: z.object({
        services: z.array(objectIdSchemaOptional).min(1),
        discountPercentage: z.number().min(0).max(100),
    })
})

const deleteOfferSchema = z.object({
    body: z.object({
        offers: z.array(objectIdSchemaOptional).min(1),
    })
})

export const OfferedValidation = {
    createOfferSchema,
    deleteOfferSchema
}