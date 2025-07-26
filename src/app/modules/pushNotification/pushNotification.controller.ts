import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { sendToTopic } from './pushNotification.utils';
import AppError from '../../../errors/AppError';

const sendPushNotificationController = catchAsync(async (req, res) => {
  const { topic, title, body } = req.body;

  if (!topic || !title || !body) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'Missing fields! Please provide topic, title and body');
  }

  const result = await sendToTopic(topic, { title, body });

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Push notification send successfully',
    data: result,
  });
});

export const PushNotificationControllers = {
  sendPushNotificationController,
};
