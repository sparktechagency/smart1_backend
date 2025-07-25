import { z } from 'zod';

const createMessageSchema = z.object({
    body: z.object({
        chatId: z.string(),
        text: z.string().optional(),
        image: z.string().optional(),
    })
})

export const messageValidation = {
    createMessageSchema
}