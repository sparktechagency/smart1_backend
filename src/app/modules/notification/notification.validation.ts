import { z } from "zod";
import { objectIdSchemaOptional } from "../user/user.validation";

const sendNotificationSchema = z.object({
    body: z.object({
        title: z.string().min(1, 'Title is required'),
        message: z.string().min(1, 'Message is required'),
        receiver: objectIdSchemaOptional,
    })
});

export const notificationValidation = {
    sendNotificationSchema,
}