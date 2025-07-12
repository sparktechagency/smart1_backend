import { Types } from 'mongoose';

export interface INotification {
     message: string;
     receiver: Types.ObjectId;
     postId: Types.ObjectId;
     reference?: string;
     referenceModel?: 'Payment' | 'Order' | 'Message';
     screen?: 'DASHBOARD' | 'PAYMENT_HISTORY' | 'PROFILE';
     read: boolean;
     type?: 'ADMIN' | 'SYSTEM' | 'PAYMENT' | 'MESSAGE' | 'ALERT' | 'ORDER';
     title?: string;
}
