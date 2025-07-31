import { Types } from 'mongoose';
import { NOTIFICATION_MODEL_TYPE, NotificationScreen, NotificationTitle } from './notification.enum';

export interface INotification {
     message: string;
     receiver: Types.ObjectId;
     postId?: Types.ObjectId;
     reference?: Types.ObjectId;
     screen?: NotificationScreen;
     read?: boolean;
     type?: NOTIFICATION_MODEL_TYPE;
     title?: NotificationTitle;
}
