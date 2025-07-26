import { z } from "zod";

export const chatValidation = {
    createGroupChatSchema: z.object({
        body: z.object({
            participants: z.array(z.string()).min(2, 'At least 2 participants are required'),
        })
    })
}