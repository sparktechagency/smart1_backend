import { z } from "zod";
import { objectIdSchemaOptional } from "../user/user.validation";
import { NOTIFICATION_MODEL_TYPE, NotificationScreen, NotificationTitle } from "./notification.enum";

// receiver
// type
// title
// message
// reference
// referenceModel
// screen

const sendNotificationSchema = z.object({
    body: z.object({
        title: z.nativeEnum(NotificationTitle).optional(),
        message: z.string().min(1, 'Message is required').optional(),
        receiver: objectIdSchemaOptional,
        type: z.nativeEnum(NOTIFICATION_MODEL_TYPE).optional(),
        reference: objectIdSchemaOptional,
        referenceModel: z.nativeEnum(NOTIFICATION_MODEL_TYPE).optional(),
        screen: z.nativeEnum(NotificationScreen).optional(),
    })
});

export const notificationValidation = {
    sendNotificationSchema,
}