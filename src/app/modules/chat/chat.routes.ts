import express from 'express';
import auth from '../../middleware/auth';
import { USER_ROLES } from '../user/user.enums';
import { ChatController } from './chat.controller';
import validateRequest from '../../middleware/validateRequest';
import { chatValidation } from './chat.validation';
const router = express.Router();

router.post('/group', auth(USER_ROLES.USER, USER_ROLES.SERVICE_PROVIDER,USER_ROLES.ADMIN,USER_ROLES.SUPER_ADMIN), validateRequest(chatValidation.createGroupChatSchema), ChatController.createGroupChat);
router.get('/', auth(USER_ROLES.USER, USER_ROLES.SERVICE_PROVIDER,USER_ROLES.ADMIN,USER_ROLES.SUPER_ADMIN), ChatController.getChat);
router.post('/chat-with-admin', auth(USER_ROLES.USER, USER_ROLES.SERVICE_PROVIDER,USER_ROLES.ADMIN,USER_ROLES.SUPER_ADMIN), ChatController.createChatWithAdmin);
router.post('/:id', auth(USER_ROLES.USER, USER_ROLES.SERVICE_PROVIDER,USER_ROLES.ADMIN,USER_ROLES.SUPER_ADMIN), ChatController.createOneToOneChat);

export const ChatRoutes = router;
