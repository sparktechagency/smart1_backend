import { StatusCodes } from 'http-status-codes';
import { Types } from 'mongoose';
import AppError from '../../../errors/AppError';
import unlinkFile from '../../../shared/unlinkFile';
import QueryBuilder from '../../builder/QueryBuilder';
import { IJwtPayload } from '../auth/auth.interface';
import { Chat } from '../chat/chat.model';
import { MessageReaction } from './message.enum';
import { IMessage, IReaction } from './message.interface';
import { Message } from './message.model';

const sendMessageToDB = async (payload: Partial<IMessage>): Promise<IMessage> => {
     // handle chatId exists
     const chat = await Chat.findById(payload.chatId).populate('participants', 'full_name image email');
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

     //@ts-expect-error
     const io = global.io;
     if (io) {
          io.emit(`getMessage::${payload.chatId}`, response);
     }
     chat.participants.forEach((participant) => {
          if (participant.toString() !== payload.sender?.toString()) {
               //@ts-expect-error
               const io = global.io;
               if (io) {
                    io.emit(`getMessage::${participant._id}`, response);
               }
          }
     });

     return response;
};

// const getMessageFromDB = async (id: any, user: IJwtPayload): Promise<IMessage[]> => {
//      const messages = await Message.find({ chatId: id }).sort({ createdAt: -1 });
//      // if no message
//      if (!messages || messages.length === 0) {
//           throw new AppError(StatusCodes.NOT_FOUND, 'No message found');
//      }
//      // if message deleted for everyone
//      if (messages.deletedForEveryone) {
//           throw new AppError(StatusCodes.NOT_FOUND, 'No message found');
//      }
//      // if message deleted for me
//      if (messages.deletedForUsers.includes(new Types.ObjectId(user.id))) {
//           throw new AppError(StatusCodes.NOT_FOUND, 'No message found');
//      }
//      return messages;
// };

const getMessageFromDB = async (id: any, user: IJwtPayload, query: Record<string, unknown>) => {
     // Initialize the query builder with the base query
     const queryBuilder = new QueryBuilder(Message.find({ chatId: id }).sort({ createdAt: -1 }).populate('replies', 'text image').populate('sender', 'full_name image email role'), query);

     // Get messages using query builder
     const messages = await queryBuilder.filter().sort().paginate().fields().modelQuery;
     if (!messages || messages.length === 0) {
          throw new AppError(StatusCodes.NOT_FOUND, 'No message found');
     }

     // Filter out messages that are deleted for everyone or for the current user
     const filteredMessages = messages.filter((message) => {
          // Skip messages deleted for everyone
          if (message.deletedForEveryone) {
               return false;
          }
          // Skip messages deleted for the current user
          if (message.deletedForUsers && message.deletedForUsers.includes(new Types.ObjectId(user.id))) {
               return false;
          }
          return true;
     });

     // If no messages remain after filtering
     if (filteredMessages.length === 0) {
          throw new AppError(StatusCodes.NOT_FOUND, 'No message found');
     }

     // Update read status for messages not sent by current user and get updated messages
     const messageIds = filteredMessages.filter((message) => message.sender.toString() !== user.id).map((message) => message._id);

     if (messageIds.length > 0) {
          await Message.updateMany({ _id: { $in: messageIds } }, { $set: { read: true } });
     }

     // Fetch the updated messages to return the latest state
     const updatedMessages = await Message.find({
          _id: { $in: filteredMessages.map((msg) => msg._id) },
     })
          .sort({ createdAt: -1 })
          .populate('replies', 'text image')
          .populate('sender', 'full_name image email role');

     const meta = await queryBuilder.countTotal();

     return { meta, messages: updatedMessages };
};

// Reaction methods
const addRemoveEditReactionToDB = async (messageId: string, userId: string, emoji: MessageReaction): Promise<IMessage> => {
     const message = await Message.findById(messageId);
     if (!message) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Message not found');
     }

     // Check if user already reacted with this emoji
     const existingReaction = message.reactions?.find((reaction) => reaction.userId.toString() == userId);

     if (!existingReaction) {
          // Add new reaction
          const newReaction: IReaction = {
               userId: new Types.ObjectId(userId),
               emoji,
               createdAt: new Date(),
          };

          const updatedMessage = await Message.findByIdAndUpdate(messageId, { $push: { reactions: newReaction } }, { new: true }).populate('reactions.userId', 'name email');

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
     } else if (existingReaction && existingReaction.emoji == emoji) {
          const updatedMessage = await Message.findByIdAndUpdate(messageId, { $pull: { reactions: { userId: new Types.ObjectId(userId), emoji } } }, { new: true }).populate(
               'reactions.userId',
               'name email',
          );

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
     } else {
          const updatedMessage = await Message.findOneAndUpdate({ '_id': messageId, 'reactions.userId': userId }, { $set: { 'reactions.$.emoji': emoji } }, { new: true }).populate(
               'reactions.userId',
               'name email',
          );

          if (!updatedMessage) {
               throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to update reaction');
          }

          // Emit socket event
          //@ts-ignore
          const io = global.io;
          if (io) {
               io.emit(`reactionUpdated::${message.chatId}`, {
                    messageId,
                    userId,
                    emoji,
               });
          }

          return updatedMessage;
     }
};

const removeReactionFromDB = async (messageId: string, userId: string, emoji: MessageReaction): Promise<IMessage> => {
     const message = await Message.findById(messageId);
     if (!message) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Message not found');
     }

     const updatedMessage = await Message.findByIdAndUpdate(messageId, { $pull: { reactions: { userId: new Types.ObjectId(userId), emoji } } }, { new: true }).populate(
          'reactions.userId',
          'name email',
     );

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
const pinUpinMessageTogglerToDB = async (messageId: string, userId: string): Promise<IMessage> => {
     const message = await Message.findById(messageId);
     if (!message) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Message not found');
     }

     if (message.isPinned) {
          const updatedMessage = await Message.findByIdAndUpdate(
               messageId,
               {
                    isPinned: false,
                    $unset: { pinnedBy: 1, pinnedAt: 1 },
               },
               { new: true },
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
     }

     const updatedMessage = await Message.findByIdAndUpdate(
          messageId,
          {
               isPinned: true,
               pinnedBy: new Types.ObjectId(userId),
               pinnedAt: new Date(),
          },
          { new: true },
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

     await Message.findByIdAndUpdate(messageId, { $addToSet: { deletedForUsers: new Types.ObjectId(userId) } });

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

     await Message.findByIdAndUpdate(messageId, {
          deletedForEveryone: true,
          deletedAt: new Date(),
          text: 'This message was deleted',
          $unset: { image: 1 },
     });

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
     const chat = await Chat.findOne({
          _id: new Types.ObjectId(chatId),
          participants: { $in: [new Types.ObjectId(userId)] },
     });

     if (!chat) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Chat not found');
     }

     // Mark all messages in this chat as deleted for this user
     await Message.updateMany({ chatId: new Types.ObjectId(chatId) }, { $addToSet: { deletedForUsers: new Types.ObjectId(userId) } });

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

     if (!pinnedMessages || pinnedMessages.length === 0) {
          throw new AppError(StatusCodes.NOT_FOUND, 'No pinned messages found');
     }
     return pinnedMessages;
};

const replyMessageToDB = async (payload: Partial<IMessage>): Promise<IMessage> => {
     const parentMessage = await Message.findById(payload.replyTo);
     if (!parentMessage) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Message not found');
     }

     const replyMessage: Partial<IMessage> = {
          chatId: parentMessage.chatId,
          replyTo: parentMessage._id,
          sender: new Types.ObjectId(payload.sender),
          text: payload.text,
          image: payload.image,
     };

     const newMessage = await Message.create(replyMessage);

     if (!newMessage) {
          if (payload.image) {
               unlinkFile(payload.image);
          }
          throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to send reply message');
     }

     // add reply to parent message
     parentMessage.replies?.push(newMessage._id);

     await parentMessage.save();

     // Emit socket event
     //@ts-ignore
     const io = global.io;
     if (io) {
          io.emit(`getMessage::${parentMessage.chatId}`, newMessage);
     }

     return newMessage;
};

export const MessageService = {
     sendMessageToDB,
     getMessageFromDB,
     addRemoveEditReactionToDB,
     removeReactionFromDB,
     pinUpinMessageTogglerToDB,
     deleteMessageForMeByMessageId,
     deleteMessageForEveryoneByMessageId,
     deleteChatForMeByChatId,
     getPinnedMessagesFromDB,
     replyMessageToDB,
};
