import bcrypt from 'bcrypt';
import { StatusCodes } from 'http-status-codes';
import config from '../../../config';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { UserService } from './user.service';
const createUser = catchAsync(async (req, res) => {
     const { ...userData } = req.body;
     const result = await UserService.createUserToDB(userData);

     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.OK,
          message: 'User created successfully',
          data: result,
     });
});

const createServiceProviderToDB = catchAsync(async (req, res) => {
     const { ...userData } = req.body;
     const result = await UserService.createServiceProviderToDB(userData, req.get('host') || '', req.protocol);

     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.OK,
          message: 'Service Provider created successfully',
          data: result,
     });
});

const getUserProfile = catchAsync(async (req, res) => {
     const user: any = req.user;
     const result = await UserService.getUserProfileFromDB(user);

     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.OK,
          message: 'Profile data retrieved successfully',
          data: result,
     });
});

//update profile
const updateProfile = catchAsync(async (req, res) => {
     const user: any = req.user;
     if ('role' in req.body) {
          delete req.body.role;
     }
     // If password is provided
     if (req.body.password) {
          req.body.password = await bcrypt.hash(req.body.password, Number(config.bcrypt_salt_rounds));
     }

     const result = await UserService.updateProfileToDB(user, req.body);

     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.OK,
          message: 'Profile updated successfully',
          data: result,
     });
});
//delete profile
const deleteProfile = catchAsync(async (req, res) => {
     const { id }: any = req.user;
     const { password } = req.body;
     const isUserVerified = await UserService.verifyUserPassword(id, password);
     if (!isUserVerified) {
          return sendResponse(res, {
               success: false,
               statusCode: StatusCodes.UNAUTHORIZED,
               message: 'Incorrect password. Please try again.',
          });
     }

     const result = await UserService.deleteUser(id);

     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.OK,
          message: 'Profile deleted successfully',
          data: result,
     });
});

const getAllRoleBasedUser = catchAsync(async (req, res) => {
     const result = await UserService.getAllRoleBasedUser();

     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.OK,
          message: 'User retrieved successfully',
          data: result,
     });
});

const updateUserById = catchAsync(async (req, res) => {
     const { id } = req.params;
     const { ...userData } = req.body;
     const result = await UserService.updateUserByIdToDB(id, userData);

     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.OK,
          message: 'User updated successfully',
          data: result,
     });
});

const createAdminToDB = catchAsync(async (req, res) => {
     const { ...userData } = req.body;
     const result = await UserService.createAdminToDB(userData);

     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.OK,
          message: 'Admin created successfully',
          data: result,
     });
});

const toggleUserStatus = catchAsync(async (req, res) => {
     const { id } = req.params;
     const result = await UserService.toggleUserStatus(id);

     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.OK,
          message: 'User status toggled successfully',
          data: result,
     });
});

const deleteUser = catchAsync(async (req, res) => {
     const { id } = req.params;
     const result = await UserService.deleteUser(id);

     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.OK,
          message: 'User deleted successfully',
          data: result,
     });
});

export const UserController = {
     createUser,
     createServiceProviderToDB,
     getUserProfile,
     updateProfile,
     deleteProfile,
     getAllRoleBasedUser,
     updateUserById,
     createAdminToDB,
     toggleUserStatus,
     deleteUser
};
