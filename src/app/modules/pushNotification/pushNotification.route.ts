import express from 'express';
import { PushNotificationControllers } from './pushNotification.controller';
import { PushNotificationZodSchema } from './pushNotification.validation';
import validateRequest from '../../middleware/validateRequest';

const router = express.Router();

router.post(
  '/send',validateRequest(PushNotificationZodSchema),   
  PushNotificationControllers.sendPushNotificationController,
);

export const PushNotificationRoutes = router;
