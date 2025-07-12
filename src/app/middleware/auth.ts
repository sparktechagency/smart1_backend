import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { Secret } from 'jsonwebtoken';
import config from '../../config';
import AppError from '../../errors/AppError';
import { verifyToken } from '../../utils/verifyToken';
import { User } from '../modules/user/user.model';

const auth =
     (...roles: string[]) =>
     async (req: Request, res: Response, next: NextFunction) => {
          try {
               const tokenWithBearer = req.headers.authorization;
               if (!tokenWithBearer) {
                    throw new AppError(StatusCodes.UNAUTHORIZED, 'You are not authorized !!');
               }
               if (!tokenWithBearer.startsWith('Bearer')) {
                    throw new AppError(StatusCodes.UNAUTHORIZED, 'Token send is not valid !!');
               }

               if (tokenWithBearer && tokenWithBearer.startsWith('Bearer')) {
                    const token = tokenWithBearer.split(' ')[1];

                    //verify token
                    let verifyUser: any;
                    try {
                         verifyUser = verifyToken(token, config.jwt.jwt_secret as Secret);
                    } catch (error) {
                         throw new AppError(StatusCodes.UNAUTHORIZED, 'You are not authorized !!');
                    }

                    //  user cheak isUserExist or not
                    const user = await User.isExistUserById(verifyUser.id);
                    if (!user) {
                         throw new AppError(StatusCodes.NOT_FOUND, 'This user is not found !!');
                    }

                    if (user?.status === 'blocked') {
                         throw new AppError(StatusCodes.FORBIDDEN, 'This user is blocked !!');
                    }

                    if (user?.isDeleted) {
                         throw new AppError(StatusCodes.FORBIDDEN, 'This user accaunt is deleted !!');
                    }

                    //guard user
                    if (roles.length && !roles.includes(verifyUser?.role)) {
                         throw new AppError(StatusCodes.FORBIDDEN, "You don't have permission to access this api !!");
                    }

                    //set user to header
                    req.user = verifyUser;
                    next();
               }
          } catch (error) {
               next(error);
          }
     };

export default auth;
