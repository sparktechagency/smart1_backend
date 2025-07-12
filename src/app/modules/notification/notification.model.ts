import { model, Schema } from 'mongoose';
import { INotification } from './notification.interface';

enum NotificationType {
     ADMIN = 'ADMIN',
     SUPER_ADMIN = 'SUPER_ADMIN',
     SYSTEM = 'SYSTEM',
     PAYMENT = 'PAYMENT',
     MESSAGE = 'MESSAGE',
     REFUND = 'REFUND',
     ALERT = 'ALERT',
     ORDER = 'ORDER',
     DELIVERY = 'DELIVERY',
     CANCELLED = 'CANCELLED',
}

enum NotificationScreen {
     DASHBOARD = 'DASHBOARD',
     PAYMENT_HISTORY = 'PAYMENT_HISTORY',
     PROFILE = 'PROFILE',
}

const notificationSchema = new Schema<INotification>(
     {
          message: {
               type: String,
               required: false,
          },
          postId: {
               type: Schema.Types.ObjectId,
               ref: 'Comment',
               required: false,
          },
          title: {
               type: String,
               required: false,
          },
          receiver: {
               type: Schema.Types.ObjectId,
               ref: 'User',
               required: false,
               index: true,
          },
          reference: {
               type: Schema.Types.ObjectId,
               refPath: 'referenceModel',
               required: false,
          },
          referenceModel: {
               type: String,
               enum: ['PAYMENT', 'ORDER', 'MESSAGE', 'REFUND', 'ALERT', 'DELIVERY', 'CANCELLED'],
               required: false,
          },
          screen: {
               type: String,
               enum: Object.values(NotificationScreen),
               required: false,
          },
          read: {
               type: Boolean,
               default: false,
               index: true,
          },
          type: {
               type: String,
               enum: Object.values(NotificationType),
               required: false,
          },
     },
     {
          timestamps: true,
     },
);

notificationSchema.index({ receiver: 1, read: 1 });

export const Notification = model<INotification>('Notification', notificationSchema);
