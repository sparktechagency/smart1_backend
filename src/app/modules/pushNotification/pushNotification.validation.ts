import { z } from 'zod';
import { PUSHNOTIFICATION_TOPIC } from './pushNotification.enum';


export const PushNotificationZodSchema = z.object({
    body: z.object({
        topic: z.nativeEnum(PUSHNOTIFICATION_TOPIC),
        title: z.string({ required_error: 'Title is required' }),
        body: z.string({ required_error: 'Message Body is required' }),
    })
});
