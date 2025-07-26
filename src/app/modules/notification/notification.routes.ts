import express from 'express';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { USER_ROLES } from '../user/user.enums';
import { NotificationController } from './notification.controller';
import { notificationValidation } from './notification.validation';
const router = express.Router();

router.get('/', auth(USER_ROLES.USER, USER_ROLES.SERVICE_PROVIDER), NotificationController.getNotificationFromDB);
router.get('/admin', auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN), NotificationController.adminNotificationFromDB);
router.patch('/admin/single/:id', auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN), NotificationController.readNotificationSingle);
router.patch('/single/:id', auth(USER_ROLES.USER, USER_ROLES.SERVICE_PROVIDER), NotificationController.readNotificationSingle);
router.patch('/read-all', auth(USER_ROLES.USER, USER_ROLES.SERVICE_PROVIDER), NotificationController.readAllNotificationAsUser);
router.patch('/admin/read-all', auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN), NotificationController.readAlladminReadNotifications);
router.post('/admin/send-notification', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), validateRequest(notificationValidation.sendNotificationSchema), NotificationController.sendNotificationAdminByAdmin);

export const NotificationRoutes = router;
