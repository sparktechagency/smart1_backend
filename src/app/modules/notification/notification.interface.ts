import { Types } from 'mongoose';
import { NOTIFICATION_MODEL_TYPE } from './notification.enum';

export interface INotification {
     message: string;
     receiver: Types.ObjectId;
     postId: Types.ObjectId;
     reference?: string;
     referenceModel?: NOTIFICATION_MODEL_TYPE;
     screen?: 'DASHBOARD' | 'PAYMENT_HISTORY' | 'PROFILE';
     read: boolean;
     type?: NOTIFICATION_MODEL_TYPE;
     title?: string;
}
