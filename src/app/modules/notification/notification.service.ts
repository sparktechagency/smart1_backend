import { StatusCodes } from 'http-status-codes';
import { JwtPayload } from 'jsonwebtoken';
import AppError from '../../../errors/AppError';
import { sendNotifications } from '../../../helpers/notificationsHelper';
import QueryBuilder from '../../builder/QueryBuilder';
import { USER_ROLES } from '../user/user.enums';
import { User } from '../user/user.model';
import { NOTIFICATION_MODEL_TYPE } from './notification.enum';
import { INotification } from './notification.interface';
import { Notification } from './notification.model';

// get notifications
const getNotificationFromDB = async (user: JwtPayload, query: Record<string, unknown>) => {
     const queryBuilder = new QueryBuilder(
          Notification.find({ receiver: user.id })
               .populate('receiver', 'full_name email phoneNumber')
               .populate({
                    path: 'reference',
                    model: NOTIFICATION_MODEL_TYPE.BOOKING,
                    select: 'user servicingDestination geoLocationOfDestination bookingDate bookingTime',
                    populate: {
                         path: 'user',
                         model: NOTIFICATION_MODEL_TYPE.USER,
                         select: 'full_name email phone image',
                    },
               }),
          query,
     );
     const result = await queryBuilder.filter().sort().search(['title', 'message']).paginate().fields().modelQuery.exec();
     const meta = await queryBuilder.countTotal();
     const unreadCount = await Notification.countDocuments({
          receiver: user.id,
          read: false,
     });

     const data: any = {
          meta,
          unreadCount,
          result,
     };

     return data;
};

// read notifications only for user
const readAllNotificationAsUserToDB = async (user: JwtPayload): Promise<INotification | undefined> => {
     const result: any = await Notification.updateMany({ receiver: user.id, read: false }, { $set: { read: true } });
     if (!result) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Notification not found');
     }
     return result;
};
const readNotificationSingleToDB = async (id: string, user: JwtPayload): Promise<INotification | undefined> => {
     const query: {
          _id: string;
          receiver?: string;
     } = { _id: id };

     if (user.role === USER_ROLES.USER || user.role === USER_ROLES.SERVICE_PROVIDER) {
          query.receiver = user.id;
     }

     const result: any = await Notification.findOneAndUpdate(
          query,
          {
               $set: { read: true },
          },
          {
               new: true,
          },
     );
     if (!result) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Notification not found');
     }
     return result;
};

// get notifications for admin
const adminNotificationFromDB = async (userId: string, query: Record<string, unknown>) => {
     const user = await User.findById(userId);
     if (!user) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Admin not found');
     }
     if (user.role === USER_ROLES.SUPER_ADMIN || user.role === USER_ROLES.ADMIN) {
          const querBuilder = new QueryBuilder(Notification.find({ receiver: user.id }).populate('receiver', 'full_name email phoneNumber'), query).filter().sort().paginate().fields();
          const result = await querBuilder.modelQuery;
          const meta = await querBuilder.countTotal();
          const unreadCount = await Notification.countDocuments({
               receiver: user.id,
               read: false,
          });
          return {
               meta,
               unreadCount,
               result,
          };
     }
};

// read notifications only for admin
const readAlladminReadNotificationsToDB = async (user: JwtPayload): Promise<INotification | null> => {
     // const result: any = await Notification.updateMany({ receiver: user.id, read: false }, { $set: { read: true } }, { new: true });
     const result: any = await Notification.updateMany({ receiver: user.id, read: false }, { $set: { read: true } });
     return result;
};

const sendNotificationAdminByAdminToDB = async (payload: any) => {
     const { title, message, receiverRole, heading } = payload;

     // Handle specific receiver if provided
     if (receiverRole) {
          // Fetch users with role 'USER' and 'SERVICE_PROVIDER'
          const users = await User.find({ role: receiverRole });
          if (!users || users.length === 0) {
               throw new AppError(StatusCodes.NOT_FOUND, 'No users found');
          }

          // Send notification to all users
          const notificationPromises = users.map((user) => {
               const notificationData = {
                    title,
                    message: message!,
                    type: NOTIFICATION_MODEL_TYPE.NOTIFICATION,
                    receiver: user._id,
                    heading,
               };
               return sendNotifications(notificationData);
          });

          try {
               const result = await Promise.all(notificationPromises);
               return result;
          } catch (error: any) {
               console.log(error);
               throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error sending notifications to users');
          }
     } else {
          // Fetch users with role 'USER' and 'SERVICE_PROVIDER'
          const users = await User.find({ role: { $in: [USER_ROLES.USER, USER_ROLES.SERVICE_PROVIDER] } });
          if (!users || users.length === 0) {
               throw new AppError(StatusCodes.NOT_FOUND, 'No users found');
          }

          // Send notification to all users
          const notificationPromises = users.map((user) => {
               const notificationData = {
                    title,
                    message: message!,
                    type: NOTIFICATION_MODEL_TYPE.NOTIFICATION,
                    receiver: user._id,
                    heading,
               };
               return sendNotifications(notificationData);
          });

          try {
               const result = await Promise.all(notificationPromises);
               return result;
          } catch (error: any) {
               console.log(error);
               throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, 'Error sending notifications to users');
          }
     }
};

export const NotificationService = {
     adminNotificationFromDB,
     getNotificationFromDB,
     readAllNotificationAsUserToDB,
     readAlladminReadNotificationsToDB,
     sendNotificationAdminByAdminToDB,
     readNotificationSingleToDB,
};
