import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { StatusCodes } from 'http-status-codes';
import { NotificationService } from './notification.service';

const getNotificationFromDB = catchAsync(async (req, res) => {
     const user: any = req.user;
     const result = await NotificationService.getNotificationFromDB(user, req.query);

     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Notifications Retrieved Successfully',
          data: {
               meta: result?.meta,
               unreadCount: result?.unreadCount,
               result,
          },
     });
});

const adminNotificationFromDB = catchAsync(async (req, res) => {
     const { id }: any = req.user;
     const result = await NotificationService.adminNotificationFromDB(id, req.query);

     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Notifications Retrieved Successfully',
          data: result,
     });
});

const readNotification = catchAsync(async (req, res) => {
     const user: any = req.user;
     const result = await NotificationService.readNotificationToDB(user);

     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Notification Read Successfully',
          data: result,
     });
});
const readNotificationSingle = catchAsync(async (req, res) => {
     const { id } = req.params;
     const result = await NotificationService.readNotificationSingleToDB(id);

     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Notification Read Successfully',
          data: result,
     });
});

const adminReadNotification = catchAsync(async (req, res) => {
     const result = await NotificationService.adminReadNotificationToDB();

     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Notification Read Successfully',
          data: result,
     });
});
// send admin notifications to the users accaunts
const sendAdminNotification = catchAsync(async (req, res) => {
     const result = await NotificationService.adminSendNotificationFromDB(req.body);
     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Notification Send Successfully',
          data: result,
     });
});

export const NotificationController = {
     adminNotificationFromDB,
     getNotificationFromDB,
     readNotification,
     adminReadNotification,
     sendAdminNotification,
     readNotificationSingle,
};
