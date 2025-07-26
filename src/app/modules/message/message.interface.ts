import { Model, Types } from 'mongoose';
import { MessageReaction } from './message.enum';

export interface IReaction {
     userId: Types.ObjectId;
     emoji: MessageReaction;
     createdAt?: Date;
};

export interface IMessage {
     chatId: Types.ObjectId;
     replyTo?: Types.ObjectId | null;
     replies?: Types.ObjectId[];
     sender: Types.ObjectId;
     text?: string;
     image?: string;
     reactions?: IReaction[];
     isPinned?: boolean;
     pinnedBy?: Types.ObjectId;
     pinnedAt?: Date;
     deletedForUsers?: Types.ObjectId[];
     deletedForEveryone?: boolean;
     deletedAt?: Date;
};

export type MessageModel = Model<IMessage, Record<string, unknown>>;
