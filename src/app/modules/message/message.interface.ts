import { Model, Types } from 'mongoose';
import { MessageReaction } from './message.enum';

export type IReaction = {
     userId: Types.ObjectId;
     emoji: MessageReaction;
     createdAt?: Date;
};

export type IMessage = {
     chatId: Types.ObjectId;
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
