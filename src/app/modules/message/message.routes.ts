import express from 'express';
import { MessageController } from './message.controller';
import fileUploadHandler from '../../middleware/fileUploadHandler';
import auth from '../../middleware/auth';
import { USER_ROLES } from '../user/user.enums';
import validateRequest from '../../middleware/validateRequest';
import { messageValidation } from './message.validation';

const router = express.Router();

router.post('/', fileUploadHandler(), auth(USER_ROLES.USER, USER_ROLES.SERVICE_PROVIDER), validateRequest(messageValidation.createMessageSchema), MessageController.sendMessage);
router.get('/:id', auth(USER_ROLES.USER, USER_ROLES.SERVICE_PROVIDER), MessageController.getMessage);

export const MessageRoutes = router;
