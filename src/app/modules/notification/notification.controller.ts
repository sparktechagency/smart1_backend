import { StatusCodes } from 'http-status-codes';
import { JwtPayload } from 'jsonwebtoken';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { NotificationService } from './notification.service';

const getNotificationFromDB = catchAsync(async (req, res) => {
     const user: any = req.user;
     const result = await NotificationService.getNotificationFromDB(user, req.query);

     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Notifications Retrieved Successfully',
          data: result,
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

const readAllNotificationAsUser = catchAsync(async (req, res) => {
     const user: any = req.user;
     const result = await NotificationService.readAllNotificationAsUserToDB(user);

     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Notification Read Successfully',
          data: result,
     });
});
const readNotificationSingle = catchAsync(async (req, res) => {
     const { id } = req.params;
     const result = await NotificationService.readNotificationSingleToDB(id, req.user as JwtPayload);

     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Notification Read Successfully',
          data: result,
     });
});

const readAlladminReadNotifications = catchAsync(async (req, res) => {
     const result = await NotificationService.readAlladminReadNotificationsToDB(req.user as JwtPayload);

     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Notification Read Successfully',
          data: result,
     });
});
// send admin notifications to the users accaunts
const sendNotificationAdminByAdmin = catchAsync(async (req, res) => {
     const result = await NotificationService.sendNotificationAdminByAdminToDB(req.body);
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
     readAllNotificationAsUser,
     readAlladminReadNotifications,
     sendNotificationAdminByAdmin,
     readNotificationSingle,
};
