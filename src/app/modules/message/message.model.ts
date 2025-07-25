import { Schema, model } from 'mongoose';
import { IMessage, MessageModel } from './message.interface';
import { MessageReaction } from './message.enum';

const reactionSchema = new Schema({
     userId: {
          type: Schema.Types.ObjectId,
          required: true,
          ref: 'User',
     },
     emoji: {
          type: String,
          required: true,
          enum: Object.values(MessageReaction),
     },
     createdAt: {
          type: Date,
          default: Date.now,
     },
});

const messageSchema = new Schema<IMessage, MessageModel>(
     {
          chatId: {
               type: Schema.Types.ObjectId,
               required: true,
               ref: 'Chat',
          },
          sender: {
               type: Schema.Types.ObjectId,
               required: true,
               ref: 'User',
          },
          text: {
               type: String,
               required: false,
          },
          image: {
               type: String,
               required: false,
          },
          reactions: {
               type: [reactionSchema],
               default: [],
          },
          isPinned: {
               type: Boolean,
               default: false,
          },
          pinnedBy: {
               type: Schema.Types.ObjectId,
               ref: 'User',
               required: false,
          },
          pinnedAt: {
               type: Date,
               required: false,
          },
          deletedForUsers: {
               type: [Schema.Types.ObjectId],
               default: [],
               ref: 'User',
          },
          deletedForEveryone: {
               type: Boolean,
               default: false,
          },
          deletedAt: {
               type: Date,
               required: false,
          },
     },
     {
          timestamps: true,
     },
);

export const Message = model<IMessage, MessageModel>('Message', messageSchema);
