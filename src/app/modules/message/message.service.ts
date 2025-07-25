import { StatusCodes } from 'http-status-codes';
import AppError from '../../../errors/AppError';
import { Chat } from '../chat/chat.model';
import { IMessage } from './message.interface';
import { Message } from './message.model';
import unlinkFile from '../../../shared/unlinkFile';

const sendMessageToDB = async (payload: Partial<IMessage>): Promise<IMessage> => {
     // handle chatId exists
     const chat = await Chat.findById(payload.chatId);
     if (!chat) {
          if (payload.image) {
               console.log(payload.image);
               unlinkFile(payload.image);
          }
          throw new AppError(StatusCodes.NOT_FOUND, 'Chat not found');
     }
     // save to DB
     const response = await Message.create(payload);

     // if no response then return error and unlinke the image if any
     if (!response) {
          if (payload.image) {
               console.log(payload.image);
               unlinkFile(payload.image);
          }
          throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to send message');
     }

     //@ts-ignore
     const io = global.io;
     if (io) {
          io.emit(`getMessage::${payload?.chatId}`, response);
     }

     return response;
};

const getMessageFromDB = async (id: any): Promise<IMessage[]> => {
     const messages = await Message.find({ chatId: id }).sort({ createdAt: -1 });
     return messages;
};

export const MessageService = { sendMessageToDB, getMessageFromDB };
