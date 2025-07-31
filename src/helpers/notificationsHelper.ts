import { INotification } from '../app/modules/notification/notification.interface';
import { Notification } from '../app/modules/notification/notification.model';

// receiver: user.id,
//      type: NOTIFICATION_MODEL_TYPE.BOOKING,
//           title: 'Booking re-scheduled',
//                booking: thisBooking,
// ========================================
// receiver
// type
// title
// message
// booking
// reference
// referenceModel
// screen
// =========================================
// message: string;
//      postId: Types.ObjectId;****
//      read: boolean; ****


export const sendNotifications = async (data: any): Promise<INotification> => {
     const result = await Notification.create(data);

     //@ts-ignore
     const socketIo = global.io;
     if (socketIo) {
          if (data.receiver) {
               socketIo.emit(`notification::${data.receiver}`, result);
          } else {
               socketIo.emit('notification::all', result);
          }
     }

     return result;
};
