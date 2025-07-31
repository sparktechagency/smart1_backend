import { Types } from 'mongoose';
import { NOTIFICATION_MODEL_TYPE, NotificationScreen } from './notification.enum';

export interface INotification {
     message: string;
     receiver: Types.ObjectId;
     postId: Types.ObjectId;
     reference?: string;
     screen?: NotificationScreen;
     read: boolean;
     type?: NOTIFICATION_MODEL_TYPE;
     title?: string;
}
