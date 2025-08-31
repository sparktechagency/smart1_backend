import { model, Schema } from 'mongoose';
import { NOTIFICATION_MODEL_TYPE, NotificationScreen, NotificationTitle } from './notification.enum';
import { INotification } from './notification.interface';




const notificationSchema = new Schema<INotification>(
     {
          heading: {
               type: String,
               required: false,
          },
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
               enum: Object.values(NotificationTitle),
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
               enum: Object.values(NOTIFICATION_MODEL_TYPE),
               required: false,
          },
          data: {
               type: Object,
               required: false,
          },
     },
     {
          timestamps: true,
     },
);

notificationSchema.index({ receiver: 1, read: 1 });

export const Notification = model<INotification>('Notification', notificationSchema);
