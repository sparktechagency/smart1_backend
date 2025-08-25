import express from 'express';
import auth from '../../middleware/auth';
import fileUploadHandler from '../../middleware/fileUploadHandler';
import validateRequest from '../../middleware/validateRequest';
import { USER_ROLES } from '../user/user.enums';
import { MessageController } from './message.controller';
import { messageValidation } from './message.validation';

const router = express.Router();

// Basic message operations
router.post('/', fileUploadHandler(), auth(USER_ROLES.USER, USER_ROLES.SERVICE_PROVIDER,USER_ROLES.ADMIN,USER_ROLES.SUPER_ADMIN), validateRequest(messageValidation.createMessageSchema), MessageController.sendMessage);

// Reaction routes
router.patch('/reaction/:messageId', auth(USER_ROLES.USER, USER_ROLES.SERVICE_PROVIDER,USER_ROLES.ADMIN,USER_ROLES.SUPER_ADMIN), validateRequest(messageValidation.reactionSchema), MessageController.addRemoveEditReaction);

// Pin routes
router.patch('/pin/:messageId', auth(USER_ROLES.USER, USER_ROLES.SERVICE_PROVIDER,USER_ROLES.ADMIN,USER_ROLES.SUPER_ADMIN), MessageController.pinUpinMessageToggler);
router.get('/pinned/:chatId', auth(USER_ROLES.USER, USER_ROLES.SERVICE_PROVIDER,USER_ROLES.ADMIN,USER_ROLES.SUPER_ADMIN), MessageController.getPinnedMessages);

// Delete routes
router.delete('/delete-for-me/:messageId', auth(USER_ROLES.USER, USER_ROLES.SERVICE_PROVIDER,USER_ROLES.ADMIN,USER_ROLES.SUPER_ADMIN), MessageController.deleteMessageForMe);
router.delete('/delete-for-everyone/:messageId', auth(USER_ROLES.USER, USER_ROLES.SERVICE_PROVIDER,USER_ROLES.ADMIN,USER_ROLES.SUPER_ADMIN), MessageController.deleteMessageForEveryone);
router.delete('/chat/delete-for-me/:chatId', auth(USER_ROLES.USER, USER_ROLES.SERVICE_PROVIDER,USER_ROLES.ADMIN,USER_ROLES.SUPER_ADMIN), MessageController.deleteChatForMe);

// replyMessageRoute
router.post('/reply/:messageId', fileUploadHandler(), auth(USER_ROLES.USER, USER_ROLES.SERVICE_PROVIDER,USER_ROLES.ADMIN,USER_ROLES.SUPER_ADMIN), validateRequest(messageValidation.replyMessageSchema), MessageController.replyMessage);

router.get('/:id', auth(USER_ROLES.USER, USER_ROLES.SERVICE_PROVIDER,USER_ROLES.ADMIN,USER_ROLES.SUPER_ADMIN), MessageController.getMessage);



export const MessageRoutes = router;
