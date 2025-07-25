import express from 'express';
import auth from '../../middleware/auth';
import { USER_ROLES } from '../user/user.enums';
import { ChatController } from './chat.controller';
import validateRequest from '../../middleware/validateRequest';
import { chatValidation } from './chat.validation';
const router = express.Router();

router.post('/group', auth(USER_ROLES.USER, USER_ROLES.SERVICE_PROVIDER), validateRequest(chatValidation.createGroupChatSchema), ChatController.createGroupChat);
router.get('/', auth(USER_ROLES.USER, USER_ROLES.SERVICE_PROVIDER), ChatController.getChat);
router.post('/:id', auth(USER_ROLES.USER, USER_ROLES.SERVICE_PROVIDER), ChatController.createOneToOneChat);

export const ChatRoutes = router;
