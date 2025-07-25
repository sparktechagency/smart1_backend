import { StatusCodes } from 'http-status-codes';
import { Types } from 'mongoose';
import AppError from '../../../errors/AppError';
import unlinkFile from '../../../shared/unlinkFile';
import { Chat } from '../chat/chat.model';
import { MessageReaction } from './message.enum';
import { IMessage, IReaction } from './message.interface';
import { Message } from './message.model';

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

// Reaction methods
const addRemoveEditReactionToDB = async (messageId: string, userId: string, emoji: MessageReaction): Promise<IMessage> => {
     const message = await Message.findById(messageId);
     if (!message) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Message not found');
     }

     // Check if user already reacted with this emoji
     const existingReaction = message.reactions?.find(
          (reaction) => reaction.userId.toString() === userId && reaction.emoji === emoji
     );

     if (existingReaction) {
          // throw new AppError(StatusCodes.BAD_REQUEST, 'You have already reacted with this emoji');
          const updatedMessage = await Message.findByIdAndUpdate(
               messageId,
               { $pull: { reactions: { userId: new Types.ObjectId(userId), emoji } } },
               { new: true }
          ).populate('reactions.userId', 'name email');

          if (!updatedMessage) {
               throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to remove reaction');
          }

          // Emit socket event
          //@ts-ignore
          const io = global.io;
          if (io) {
               io.emit(`reactionRemoved::${message.chatId}`, {
                    messageId,
                    userId,
                    emoji,
               });
          }

          return updatedMessage;
     }

     // Add new reaction
     const newReaction: IReaction = {
          userId: new Types.ObjectId(userId),
          emoji,
          createdAt: new Date(),
     };

     const updatedMessage = await Message.findByIdAndUpdate(
          messageId,
          { $push: { reactions: newReaction } },
          { new: true }
     ).populate('reactions.userId', 'name email');

     if (!updatedMessage) {
          throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to add reaction');
     }

     // Emit socket event
     //@ts-ignore
     const io = global.io;
     if (io) {
          io.emit(`reactionAdded::${message.chatId}`, {
               messageId,
               reaction: newReaction,
          });
     }

     return updatedMessage;
};

const removeReactionFromDB = async (messageId: string, userId: string, emoji: MessageReaction): Promise<IMessage> => {
     const message = await Message.findById(messageId);
     if (!message) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Message not found');
     }

     const updatedMessage = await Message.findByIdAndUpdate(
          messageId,
          { $pull: { reactions: { userId: new Types.ObjectId(userId), emoji } } },
          { new: true }
     ).populate('reactions.userId', 'name email');

     if (!updatedMessage) {
          throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to remove reaction');
     }

     // Emit socket event
     //@ts-ignore
     const io = global.io;
     if (io) {
          io.emit(`reactionRemoved::${message.chatId}`, {
               messageId,
               userId,
               emoji,
          });
     }

     return updatedMessage;
};

// Pin methods
const pinMessageToDB = async (messageId: string, userId: string): Promise<IMessage> => {
     const message = await Message.findById(messageId);
     if (!message) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Message not found');
     }

     if (message.isPinned) {
          throw new AppError(StatusCodes.BAD_REQUEST, 'Message is already pinned');
     }

     const updatedMessage = await Message.findByIdAndUpdate(
          messageId,
          {
               isPinned: true,
               pinnedBy: new Types.ObjectId(userId),
               pinnedAt: new Date(),
          },
          { new: true }
     ).populate('pinnedBy', 'name email');

     if (!updatedMessage) {
          throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to pin message');
     }

     // Emit socket event
     //@ts-ignore
     const io = global.io;
     if (io) {
          io.emit(`messagePinned::${message.chatId}`, {
               messageId,
               pinnedBy: userId,
               pinnedAt: updatedMessage.pinnedAt,
          });
     }

     return updatedMessage;
};

const unpinMessageFromDB = async (messageId: string): Promise<IMessage> => {
     const message = await Message.findById(messageId);
     if (!message) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Message not found');
     }

     if (!message.isPinned) {
          throw new AppError(StatusCodes.BAD_REQUEST, 'Message is not pinned');
     }

     const updatedMessage = await Message.findByIdAndUpdate(
          messageId,
          {
               isPinned: false,
               $unset: { pinnedBy: 1, pinnedAt: 1 },
          },
          { new: true }
     );

     if (!updatedMessage) {
          throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to unpin message');
     }

     // Emit socket event
     //@ts-ignore
     const io = global.io;
     if (io) {
          io.emit(`messageUnpinned::${message.chatId}`, {
               messageId,
          });
     }

     return updatedMessage;
};

// Delete methods
const deleteMessageForMeByMessageId = async (messageId: string, userId: string): Promise<void> => {
     const message = await Message.findById(messageId);
     if (!message) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Message not found');
     }

     // Check if already deleted for this user
     if (message.deletedForUsers?.includes(new Types.ObjectId(userId))) {
          throw new AppError(StatusCodes.BAD_REQUEST, 'Message already deleted for you');
     }

     await Message.findByIdAndUpdate(
          messageId,
          { $addToSet: { deletedForUsers: new Types.ObjectId(userId) } }
     );

     // Emit socket event
     //@ts-ignore
     const io = global.io;
     if (io) {
          io.emit(`messageDeletedForUser::${message.chatId}`, {
               messageId,
               userId,
          });
     }
};

const deleteMessageForEveryoneByMessageId = async (messageId: string, userId: string): Promise<void> => {
     const message = await Message.findById(messageId);
     if (!message) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Message not found');
     }

     // Check if user is the sender
     if (message.sender.toString() !== userId) {
          throw new AppError(StatusCodes.FORBIDDEN, 'You can only delete your own messages for everyone');
     }

     // Check if already deleted for everyone
     if (message.deletedForEveryone) {
          throw new AppError(StatusCodes.BAD_REQUEST, 'Message already deleted for everyone');
     }

     await Message.findByIdAndUpdate(
          messageId,
          {
               deletedForEveryone: true,
               deletedAt: new Date(),
               text: 'This message was deleted',
               $unset: { image: 1 },
          }
     );

     // Delete image file if exists
     if (message.image) {
          unlinkFile(message.image);
     }

     // Emit socket event
     //@ts-ignore
     const io = global.io;
     if (io) {
          io.emit(`messageDeletedForEveryone::${message.chatId}`, {
               messageId,
               deletedBy: userId,
               deletedAt: new Date(),
          });
     }
};

const deleteChatForMeByChatId = async (chatId: string, userId: string): Promise<void> => {
     const chat = await Chat.findById(chatId);
     if (!chat) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Chat not found');
     }

     // Mark all messages in this chat as deleted for this user
     await Message.updateMany(
          { chatId: new Types.ObjectId(chatId) },
          { $addToSet: { deletedForUsers: new Types.ObjectId(userId) } }
     );

     // Emit socket event
     //@ts-ignore
     const io = global.io;
     if (io) {
          io.emit(`chatDeletedForUser::${chatId}`, {
               chatId,
               userId,
          });
     }
};

// Get pinned messages
const getPinnedMessagesFromDB = async (chatId: string): Promise<IMessage[]> => {
     const pinnedMessages = await Message.find({
          chatId: new Types.ObjectId(chatId),
          isPinned: true,
          deletedForEveryone: false,
     })
          .populate('sender', 'name email')
          .populate('pinnedBy', 'name email')
          .sort({ pinnedAt: -1 });

     return pinnedMessages;
};

const replyMessageToDB = async (messageId: string, userId: string, text: string, image: string): Promise<IMessage> => {
     const message = await Message.findById(messageId);
     if (!message) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Message not found');
     }

     const replyMessage: Partial<IMessage> = {
          chatId: message.chatId,
          sender: new Types.ObjectId(userId),
          text,
          image,
     };

     const newMessage = await Message.create(replyMessage);

     // Emit socket event
     //@ts-ignore
     const io = global.io;
     if (io) {
          io.emit(`getMessage::${message.chatId}`, newMessage);
     }

     return newMessage;
};

export const MessageService = {
     sendMessageToDB,
     getMessageFromDB,
     addRemoveEditReactionToDB,
     removeReactionFromDB,
     pinMessageToDB,
     unpinMessageFromDB,
     deleteMessageForMeByMessageId,
     deleteMessageForEveryoneByMessageId,
     deleteChatForMeByChatId,
     getPinnedMessagesFromDB,
     replyMessageToDB
};
