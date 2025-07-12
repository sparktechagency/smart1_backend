import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { AuthService } from './auth.service';
import config from '../../../config';
import passport from '../../../config/passport';
import { NextFunction, Request, Response } from 'express';
import { jwtHelper } from '../../../helpers/jwtHelper';
import { Secret } from 'jsonwebtoken';
import { IJwtPayload } from './auth.interface';
import { passportHandlers } from '../../../helpers/passportJsRedirectData';
import { failureRedirectUrl } from './auth.utils';

const verifyEmail = catchAsync(async (req, res) => {
     const { ...verifyData } = req.body;
     const result = await AuthService.verifyEmailToDB(verifyData);

     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.OK,
          message: result.message,
          data: {
               verifyToken: result.verifyToken,
               accessToken: result.accessToken,
          },
     });
});

const loginUser = catchAsync(async (req, res) => {
     const { ...loginData } = req.body;
     const result = await AuthService.loginUserFromDB(loginData);
     const cookieOptions: any = {
          secure: false,
          httpOnly: true,
          maxAge: 31536000000,
     };

     if (config.node_env === 'production') {
          cookieOptions.sameSite = 'none';
     }
     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.OK,
          message: 'User logged in successfully.',
          data: {
               accessToken: result.accessToken,
               refreshToken: result.refreshToken,
               role: result.role,
          },
     });
});

const forgetPassword = catchAsync(async (req, res) => {
     const email = req.body.email;
     const result = await AuthService.forgetPasswordToDB(email);

     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.OK,
          message: 'Please check your email. We have sent you a one-time passcode (OTP).',
          data: result,
     });
});
const forgetPasswordByUrl = catchAsync(async (req, res) => {
     const email = req.body.email;

     // Call the service function
     await AuthService.forgetPasswordByUrlToDB(email);

     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.OK,
          message: 'Please check your email. We have sent you a password reset link.',
          data: {},
     });
});

const resetPasswordByUrl = catchAsync(async (req, res) => {
     const token = req?.headers?.authorization?.split(' ')[1];
     const { ...resetData } = req.body;

     const result = await AuthService.resetPasswordByUrl(token!, resetData);

     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.OK,
          message: 'Your password has been successfully reset.',
          data: result,
     });
});
const resetPassword = catchAsync(async (req, res) => {
     const token: any = req.headers.resettoken;
     const { ...resetData } = req.body;
     const result = await AuthService.resetPasswordToDB(token!, resetData);

     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.OK,
          message: 'Your password has been successfully reset.',
          data: result,
     });
});

const changePassword = catchAsync(async (req, res) => {
     const user: any = req.user;
     const { ...passwordData } = req.body;
     const result = await AuthService.changePasswordToDB(user, passwordData);

     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.OK,
          message: 'Your password has been successfully changed',
          data: result,
     });
});
// resend Otp
const resendOtp = catchAsync(async (req, res) => {
     const { email } = req.body;
     await AuthService.resendOtpFromDb(email);

     sendResponse(res, {
          success: true,
          statusCode: StatusCodes.OK,
          message: 'OTP sent successfully again',
     });
});

// refresh token
const refreshToken = catchAsync(async (req, res) => {
     const refreshToken = req.headers?.refreshtoken as string;
     const result = await AuthService.refreshToken(refreshToken);

     sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: 'Access token retrieved successfully',
          data: result,
     });
});



const googleAuth = passport.authenticate("google", {
     scope: ["profile", "email"],
});

const googleCallback = (req: Request, res: Response, next: NextFunction) => {
     passport.authenticate(
          "google",
          {
               failureRedirect: failureRedirectUrl,
          },
          async (err: any, user: any, info: any) => {
               try {
                    if (err || !user) {
                         console.error('Google OAuth Error:', err || 'No user returned');
                         return await passportHandlers.setErrorDataAndRedirect(res, err, user);
                    }
                    console.log('user from google callback', user)
                    // Generate JWT token
                    // const token = await jwtHelper.createToken(
                    //      {
                    //           id: user._id,
                    //           role: user.role,
                    //           email: user.email
                    //      } as IJwtPayload,
                    //      config.jwt.jwt_secret as Secret,
                    //      config.jwt.jwt_expire_in as string
                    // );

                    // // Handle the successful authentication
                    // await passportHandlers.setSuccessDataAndRedirect(res, user, token);


                    const result = await AuthService.SocialLoginUserFromDB({ email: user.email });
                    const cookieOptions: any = {
                         secure: false,
                         httpOnly: true,
                         maxAge: 31536000000,
                    };

                    if (config.node_env === 'production') {
                         cookieOptions.sameSite = 'none';
                    }
                    sendResponse(res, {
                         success: true,
                         statusCode: StatusCodes.OK,
                         message: 'User logged in successfully.',
                         data: {
                              accessToken: result.accessToken,
                              refreshToken: result.refreshToken,
                              role: result.role,
                         },
                    });
               } catch (error) {
                    console.error('Error in Google callback:', error);
                    res.redirect(`${failureRedirectUrl}?error=${encodeURIComponent('Authentication error')}`);
               }
          }
     )(req, res, next);
};




const facebookAuth = passport.authenticate("facebook");

const facebookCallback = (req: Request, res: Response, next: NextFunction) => {
     passport.authenticate(
          "facebook",
          { failureRedirect: failureRedirectUrl },
          async (err: any, user: any, info: any) => {
               if (err || !user) {
                    return await passportHandlers.setErrorDataAndRedirect(res, err, user);
               }
               const token = await jwtHelper.createToken({
                    id: user._id,
                    role: user.role,
                    email: user.email
               } as IJwtPayload, config.jwt.jwt_secret as Secret, config.jwt.jwt_expire_in as string);
               await passportHandlers.setSuccessDataAndRedirect(res, user, token);
          }
     )(req, res, next);
};

export const AuthController = {
     verifyEmail,
     loginUser,
     forgetPassword,
     resetPassword,
     changePassword,
     forgetPasswordByUrl,
     resetPasswordByUrl,
     resendOtp,
     refreshToken,
     googleAuth,
     googleCallback,
     facebookAuth,
     facebookCallback,

};
