import { z } from 'zod';
import { MessageReaction } from './message.enum';

const createMessageSchema = z.object({
    body: z.object({
        chatId: z.string(),
        text: z.string().optional(),
        image: z.string().optional(),
    })
})

const reactionSchema = z.object({
    body: z.object({
        emoji: z.nativeEnum(MessageReaction),
    }),
    params: z.object({
        messageId: z.string(),
    })
})

const replyMessageSchema = z.object({
    body: z.object({
        text: z.string().optional(),
        image: z.string().optional(),
    }),
    params: z.object({
        messageId: z.string(),
    })
})

export const messageValidation = {
    createMessageSchema,
    reactionSchema,
    replyMessageSchema
}