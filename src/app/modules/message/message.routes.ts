import express from 'express';
import auth from '../../middleware/auth';
import fileUploadHandler from '../../middleware/fileUploadHandler';
import validateRequest from '../../middleware/validateRequest';
import { USER_ROLES } from '../user/user.enums';
import { MessageController } from './message.controller';
import { messageValidation } from './message.validation';

const router = express.Router();

// Basic message operations
router.post('/', fileUploadHandler(), auth(USER_ROLES.USER, USER_ROLES.SERVICE_PROVIDER), validateRequest(messageValidation.createMessageSchema), MessageController.sendMessage);

// Reaction routes
router.post('/reaction/:messageId', auth(USER_ROLES.USER, USER_ROLES.SERVICE_PROVIDER), validateRequest(messageValidation.reactionSchema), MessageController.addRemoveEditReaction);

// Pin routes
router.patch('/pin/:messageId', auth(USER_ROLES.USER, USER_ROLES.SERVICE_PROVIDER), MessageController.pinMessage);
router.patch('/unpin/:messageId', auth(USER_ROLES.USER, USER_ROLES.SERVICE_PROVIDER), MessageController.unpinMessage);
router.get('/pinned/:chatId', auth(USER_ROLES.USER, USER_ROLES.SERVICE_PROVIDER), MessageController.getPinnedMessages);

// Delete routes
router.delete('/delete-for-me/:messageId', auth(USER_ROLES.USER, USER_ROLES.SERVICE_PROVIDER), MessageController.deleteMessageForMe);
router.delete('/delete-for-everyone/:messageId', auth(USER_ROLES.USER, USER_ROLES.SERVICE_PROVIDER), MessageController.deleteMessageForEveryone);
router.delete('/chat/delete-for-me/:chatId', auth(USER_ROLES.USER, USER_ROLES.SERVICE_PROVIDER), MessageController.deleteChatForMe);

// replyMessageRoute
router.post('/reply/:messageId', fileUploadHandler(), auth(USER_ROLES.USER, USER_ROLES.SERVICE_PROVIDER), validateRequest(messageValidation.replyMessageSchema), MessageController.replyMessage);

router.get('/:id', auth(USER_ROLES.USER, USER_ROLES.SERVICE_PROVIDER), MessageController.getMessage);



export const MessageRoutes = router;
