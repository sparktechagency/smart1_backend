import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { IJwtPayload } from '../auth/auth.interface';
import { MessageService } from './message.service';

const sendMessage = catchAsync(async (req: Request, res: Response) => {
     const user = req?.user as IJwtPayload;

     let image;
     if (req.files && 'image' in req.files && req.files.image[0]) {
          image = `/image/${req.files.image[0].filename}`;
     }

     const payload = {
          ...req.body,
          image: image,
          sender: user.id,
     };

     const message = await MessageService.sendMessageToDB(payload);
     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Send Message Successfully',
          data: message,
     });
});

const getMessage = catchAsync(async (req: Request, res: Response) => {
     const id = req.params.id;
     const messages = await MessageService.getMessageFromDB(id, req.user as IJwtPayload);
     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Message Retrieve Successfully',
          data: messages,
     });
});

// Reaction controllers
const addRemoveEditReaction = catchAsync(async (req: Request, res: Response) => {
     const user = req?.user as IJwtPayload;
     const { messageId } = req.params;
     const { emoji } = req.body;

     const message = await MessageService.addRemoveEditReactionToDB(messageId, user.id, emoji);
     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Reaction added successfully',
          data: message,
     });
});

const removeReaction = catchAsync(async (req: Request, res: Response) => {
     const user = req?.user as IJwtPayload;
     const { messageId } = req.params;
     const { emoji } = req.body;

     const message = await MessageService.removeReactionFromDB(messageId, user.id, emoji);
     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Reaction removed successfully',
          data: message,
     });
});

// Pin controllers
const pinUpinMessageToggler = catchAsync(async (req: Request, res: Response) => {
     const user = req?.user as IJwtPayload;
     const { messageId } = req.params;

     const message = await MessageService.pinUpinMessageTogglerToDB(messageId, user.id);
     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Message pinned successfully',
          data: message,
     });
});



const getPinnedMessages = catchAsync(async (req: Request, res: Response) => {
     const { chatId } = req.params;

     const messages = await MessageService.getPinnedMessagesFromDB(chatId);
     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Pinned messages retrieved successfully',
          data: messages,
     });
});

// Delete controllers
const deleteMessageForMe = catchAsync(async (req: Request, res: Response) => {
     const user = req?.user as IJwtPayload;
     const { messageId } = req.params;

     await MessageService.deleteMessageForMeByMessageId(messageId, user.id);
     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Message deleted for you successfully',
          data: null,
     });
});

const deleteMessageForEveryone = catchAsync(async (req: Request, res: Response) => {
     const user = req?.user as IJwtPayload;
     const { messageId } = req.params;

     await MessageService.deleteMessageForEveryoneByMessageId(messageId, user.id);
     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Message deleted for everyone successfully',
          data: null,
     });
});

const deleteChatForMe = catchAsync(async (req: Request, res: Response) => {
     const user = req?.user as IJwtPayload;
     const { chatId } = req.params;

     await MessageService.deleteChatForMeByChatId(chatId, user.id);
     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Chat deleted for you successfully',
          data: null,
     });
});

const replyMessage = catchAsync(async (req: Request, res: Response) => {
     const user = req?.user as IJwtPayload;

     let image;
     if (req.files && 'image' in req.files && req.files.image[0]) {
          image = `/image/${req.files.image[0].filename}`;
     }

     const payload = {
          ...req.body,
          replyTo: req.params.messageId,
          image: image,
          sender: user.id,
     };

     const message = await MessageService.replyMessageToDB(payload);

     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Reply message sent successfully',
          data: message,
     });
});

export const MessageController = {
     sendMessage,
     getMessage,
     addRemoveEditReaction,
     pinUpinMessageToggler,
     getPinnedMessages,
     deleteMessageForMe,
     deleteMessageForEveryone,
     deleteChatForMe,
     replyMessage
};
