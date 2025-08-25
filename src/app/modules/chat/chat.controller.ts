import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { IJwtPayload } from '../auth/auth.interface';
import { ChatService } from './chat.service';
import { User } from '../user/user.model';
import { USER_ROLES } from '../user/user.enums';

const createOneToOneChat = catchAsync(async (req: Request, res: Response) => {
     const user = req.user as IJwtPayload;
     const otherUser = req.params.id;

     const participants = [user?.id, otherUser];
     const chat = await ChatService.createOneToOneChatToDB(participants);

     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Create Chat Successfully',
          data: chat,
     });
});

const getChat = catchAsync(async (req: Request, res: Response) => {
     const user = req.user as IJwtPayload;
     const search = req.query.searchTerm as string;
     const chatList = await ChatService.getChatFromDB(user, search);

     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Chat Retrieve Successfully',
          data: chatList,
     });
});

const createGroupChat = catchAsync(async (req: Request, res: Response) => {
     const user = req.user as IJwtPayload;
     const { participants } = req.body;
     participants.push(user?.id);
     const chat = await ChatService.createGroupChatToDB(participants);

     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Create Group Chat Successfully',
          data: chat,
     });
});

const createChatWithAdmin = catchAsync(async (req: Request, res: Response) => {
     const user = req.user as IJwtPayload;
     const admins = await User.find({ role: {$in:[USER_ROLES.ADMIN,USER_ROLES.SUPER_ADMIN]} }).select("_id");

     const participants = [user?.id, ...admins];
     const chat = await ChatService.createGroupChatToDB(participants);

     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Create Chat Successfully',
          data: chat,
     });
});

export const ChatController = {
     createOneToOneChat,
     getChat,
     createGroupChat,
     createChatWithAdmin,
};
