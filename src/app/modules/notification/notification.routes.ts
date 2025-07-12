import express from 'express';
import { USER_ROLES } from '../user/user.enums';
import { NotificationController } from './notification.controller';
import auth from '../../middleware/auth';
const router = express.Router();

router.get('/', auth(USER_ROLES.USER), NotificationController.getNotificationFromDB);
router.get('/admin', auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN), NotificationController.adminNotificationFromDB);
router.patch('/admin/single/:id', auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN), NotificationController.readNotificationSingle);
router.patch('/single/:id', auth(USER_ROLES.USER), NotificationController.readNotificationSingle);
router.patch('/', auth(USER_ROLES.USER, USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), NotificationController.readNotification);
router.patch('/admin', auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN), NotificationController.adminReadNotification);
router.post('/send-notification', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), NotificationController.sendAdminNotification);

export const NotificationRoutes = router;
