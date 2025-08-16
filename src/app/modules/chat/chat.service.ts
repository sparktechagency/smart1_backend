import { StatusCodes } from 'http-status-codes';
import AppError from '../../../errors/AppError';
import { IMessage } from '../message/message.interface';
import { Message } from '../message/message.model';
import { User } from '../user/user.model';
import { IChat } from './chat.interface';
import { Chat } from './chat.model';

const createOneToOneChatToDB = async (payload: any): Promise<IChat> => {
     const isExistChat: IChat | null = await Chat.findOne({
          participants: { $all: payload },
     });

     if (isExistChat) {
          return isExistChat;
     }

     // ensure all participants are unique and exists
     const uniqueParticipants = [...new Set(payload)];
     const isExistParticipants = await User.find({ _id: { $in: uniqueParticipants } });
     if (isExistParticipants.length !== uniqueParticipants.length) {
          throw new AppError(StatusCodes.BAD_REQUEST, 'All participants must be unique and exists');
     }

     const chat: IChat = await Chat.create({ participants: payload });
     return chat;
};

const createGroupChatToDB = async (participants: any): Promise<IChat> => {
     const isExistChat: IChat | null = await Chat.findOne({
          participants: { $all: [...participants] },
     });
     if (isExistChat) {
          return isExistChat;
     }

     // ensure all participants are unique and exists
     const uniqueParticipants = [...new Set(participants)];
     const isExistParticipants = await User.find({ _id: { $in: uniqueParticipants } });
     if (isExistParticipants.length !== uniqueParticipants.length) {
          throw new AppError(StatusCodes.BAD_REQUEST, 'All participants must be unique and exists');
     }

     const chat: IChat = await Chat.create({ participants: [...participants] });
     return chat;
};

const getChatFromDB = async (user: any, search: string): Promise<IChat[]> => {
     const chats: any = await Chat.find({ participants: { $in: [user.id] } })
          .populate({
               path: 'participants',
               select: '_id full_name image',
               match: {
                    _id: { $ne: user.id }, // Exclude user.id in the populated participants
                    ...(search && { full_name: { $regex: search, $options: 'i' } }), // Apply $regex only if search is valid
               },
          })
          .select('participants status');

     // Filter out chats where no participants match the search (empty participants)
     const filteredChats = chats?.filter((chat: any) => chat?.participants?.length > 0);

     //Use Promise.all to handle the asynchronous operations inside the map
     const chatList: IChat[] = await Promise.all(
          filteredChats?.map(async (chat: any) => {
               const data = chat?.toObject();

               const lastMessage: IMessage | null = await Message.findOne({
                    chatId: chat?._id,
               })
                    .sort({ createdAt: -1 })
                    .select('text image createdAt sender');
               // Count unread messages for the current user
               const unreadMessagesCount = await Message.countDocuments({
                    chatId: chat?._id,
                    read: false, // Assuming 'read' is the field that marks a message as unread
                    sender: { $ne: user.id }, // Exclude the messages sent by the current user
               });

               return {
                    unreadMessagesCount,
                    ...data,
                    lastMessage: lastMessage || null,
               };
          }),
     );

     return chatList;
};

export const ChatService = { createOneToOneChatToDB, createGroupChatToDB, getChatFromDB };
