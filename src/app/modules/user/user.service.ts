import { StatusCodes } from 'http-status-codes';
import { JwtPayload } from 'jsonwebtoken';
import mongoose from 'mongoose';
import config from '../../../config';
import AppError from '../../../errors/AppError';
import { emailHelper } from '../../../helpers/emailHelper';
import { emailTemplate } from '../../../shared/emailTemplate';
import unlinkFile from '../../../shared/unlinkFile';
import generateOTP from '../../../utils/generateOTP';
import stripe from '../../config/stripe.config';
import { BID_STATUS } from '../Bid/Bid.enum';
import { Bid } from '../Bid/Bid.model';
import { BOOKING_STATUS } from '../booking/booking.enums';
import { Booking } from '../booking/booking.model';
import { ServiceCategory } from '../ServiceCategory/ServiceCategory.model';
import { stripeAccountService } from '../stripeAccount/stripeAccount.service';
import { USER_ROLES } from './user.enums';
import { IUser } from './user.interface';
import { User } from './user.model';
// create user
const createUserToDB = async (payload: IUser): Promise<IUser> => {
     const session = await mongoose.startSession();
     session.startTransaction();

     try {
          // Check if user already exists
          const user = await User.isExistUserByEmail(payload.email);
          if (user) {
               throw new AppError(StatusCodes.CONFLICT, 'Email already exists');
          }

          // Set default role
          payload.role = USER_ROLES.USER;

          // Create user
          let createUser;
          try {
               const createUser = await User.create([payload], { session });
               if (!createUser || createUser.length === 0) {
                    throw new AppError(StatusCodes.BAD_REQUEST, 'Failed to create account');
               }
          } catch (error) {
               console.log('🚀 ~ createUserToDB ~ error:', error);
          }
          const createdUser = createUser[0];

          // Generate OTP and prepare authentication object
          const otp = generateOTP(4);
          const authentication = {
               oneTimeCode: otp,
               expireAt: new Date(Date.now() + Number(config.otp.otpExpiryTimeInMin) * 60000),
          };

          // Update user with authentication data
          await User.findByIdAndUpdate(createdUser._id, { $set: { authentication } }, { session });

          // Send email (outside of transaction, since it's external)
          const values = {
               name: createdUser.full_name,
               otp,
               email: createdUser.email!,
          };
          const createAccountTemplate = emailTemplate.createAccount(values);
          emailHelper.sendEmail(createAccountTemplate); // Not rolled back if it fails

          // Create Stripe customer
          let stripeCustomer;
          try {
               stripeCustomer = await stripe.customers.create({
                    email: createdUser.email,
                    name: createdUser.full_name,
               });
          } catch (error) {
               console.log('🚀 ~ createUserToDB ~ error:', error);
               throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to create Stripe customer');
          }

          // Update user with Stripe customer ID
          await User.findByIdAndUpdate(createdUser._id, { $set: { stripeCustomerId: stripeCustomer.id } }, { session });

          // Commit the transaction
          await session.commitTransaction();
          session.endSession();

          // Return the created user (with latest info)
          return createdUser; // fresh fetch with updates
     } catch (error) {
          console.log('🚀 ~ createUserToDB ~ error:', error);
          await session.abortTransaction();
          session.endSession();
          throw error;
     }
};
// const createUserToDB = async (payload: IUser): Promise<IUser> => {
//      //set role
//      const user = await User.isExistUserByEmail(payload.email);
//      if (user) {
//           throw new AppError(StatusCodes.CONFLICT, 'Email already exists');
//      }
//      payload.role = USER_ROLES.USER;
//      const createUser = await User.create(payload);
//      if (!createUser) {
//           throw new AppError(StatusCodes.BAD_REQUEST, 'Failed to create account');
//      }

//      //send email
//      const otp = generateOTP(4);
//      const values = {
//           name: createUser.full_name,
//           otp: otp,
//           email: createUser.email!,
//      };
//      const createAccountTemplate = emailTemplate.createAccount(values);
//      emailHelper.sendEmail(createAccountTemplate);

//      //save to DB
//      const authentication = {
//           oneTimeCode: otp,
//           expireAt: new Date(Date.now() + Number(config.otp.otpExpiryTimeInMin) * 60000),
//      };
//      await User.findOneAndUpdate({ _id: createUser._id }, { $set: { authentication } });

//      let stripeCustomer;
//      try {
//           stripeCustomer = await stripe.customers.create({
//                email: createUser.email,
//                name: createUser.full_name,
//           });
//      } catch (error) {
//           console.log('🚀 ~ createUserToDB ~ error:', error);
//           throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to create Stripe customer');
//      }

//      createUser.stripeCustomerId = stripeCustomer.id;
//      await User.findOneAndUpdate({ _id: createUser._id }, { $set: { authentication, stripeCustomerId: stripeCustomer.id } });
//      return createUser;
// };

const createServiceProviderToDB = async (payload: IUser, host: string, protocol: string): Promise<{ user: IUser; stripe_account_onboarding_url: string }> => {
     const session = await mongoose.startSession();
     session.startTransaction();

     try {
          // Check if user already exists
          const existingUser = await User.isExistUserByEmail(payload.email);
          if (existingUser) {
               throw new AppError(StatusCodes.CONFLICT, 'Email already exists');
          }

          // Validate service categories
          const serviceCategories = await ServiceCategory.find({
               _id: { $in: payload.serviceCategories },
          }).session(session);

          if (serviceCategories.length !== payload.serviceCategories!.length) {
               throw new AppError(StatusCodes.NOT_FOUND, 'Some service categories not found');
          }

          // Assign role
          payload.role = USER_ROLES.SERVICE_PROVIDER;

          // Create user
          const createdUsers = await User.create([payload], { session });
          if (!createdUsers || createdUsers.length === 0) {
               throw new AppError(StatusCodes.BAD_REQUEST, 'Failed to create account');
          }
          const createdUser = createdUsers[0];

          // Generate OTP and auth info
          const otp = generateOTP(4);
          const authentication = {
               oneTimeCode: otp,
               expireAt: new Date(Date.now() + Number(config.otp.otpExpiryTimeInMin) * 60000),
          };

          // Update user with authentication
          await User.findByIdAndUpdate(createdUser._id, { $set: { authentication } }, { session });

          // Send email (still within try block — rollback if it fails)
          const emailData = {
               name: createdUser.full_name,
               otp,
               email: createdUser.email!,
          };
          const createAccountTemplate = emailTemplate.createAccount(emailData);
          await emailHelper.sendEmail(createAccountTemplate); // Await to catch error

          // Create Stripe customer
          let stripeCustomer;
          try {
               stripeCustomer = await stripe.customers.create({
                    email: createdUser.email,
                    name: createdUser.full_name,
               });
          } catch (error) {
               console.log('🚀 ~ createServiceProviderToDB ~ error:', error);
               throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to create Stripe customer');
          }

          // Update user with Stripe customer ID
          await User.findByIdAndUpdate(createdUser._id, { $set: { stripeCustomerId: stripeCustomer.id } }, { session });

          // Commit the transaction
          await session.commitTransaction();
          session.endSession();

          // Outside transaction: Create Stripe connected account
          const stripe_account_onboarding_url = await stripeAccountService.createConnectedStripeAccount(createdUser, host, protocol);

          return {
               user: createdUser, // Return fresh data
               stripe_account_onboarding_url,
          };
     } catch (error) {
          await session.abortTransaction();
          session.endSession();
          throw error;
     }
};

// const createServiceProviderToDB = async (payload: IUser, host: string, protocol: string): Promise<IUser | any> => {
//      //set role
//      const user = await User.isExistUserByEmail(payload.email);
//      if (user) {
//           throw new AppError(StatusCodes.CONFLICT, 'Email already exists');
//      }
//      payload.role = USER_ROLES.SERVICE_PROVIDER;
//      // handl is exist serviceCategories
//      const serviceCategories = await ServiceCategory.find({
//           _id: { $in: payload.serviceCategories },
//      });

//      if (serviceCategories.length !== payload.serviceCategories!.length) {
//           throw new AppError(StatusCodes.NOT_FOUND, 'Some service categories not found');
//      }
//      const createServiceProvider = await User.create(payload);
//      if (!createServiceProvider) {
//           throw new AppError(StatusCodes.BAD_REQUEST, 'Failed to create account');
//      }

//      //send email
//      const otp = generateOTP(4);
//      const values = {
//           name: createServiceProvider.full_name,
//           otp: otp,
//           email: createServiceProvider.email!,
//      };
//      const createAccountTemplate = emailTemplate.createAccount(values);
//      emailHelper.sendEmail(createAccountTemplate);

//      //save to DB
//      const authentication = {
//           oneTimeCode: otp,
//           expireAt: new Date(Date.now() + Number(config.otp.otpExpiryTimeInMin) * 60000),
//      };
//      await User.findOneAndUpdate({ _id: createServiceProvider._id }, { $set: { authentication } });

//      let stripeCustomer;
//      try {
//           stripeCustomer = await stripe.customers.create({
//                email: createServiceProvider.email,
//                name: createServiceProvider.full_name,
//           });
//      } catch (error) {
//           console.log('🚀 ~ createUserToDB ~ error:', error);
//           throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to create Stripe customer');
//      }

//      createServiceProvider.stripeCustomerId = stripeCustomer.id;
//      await User.findOneAndUpdate({ _id: createServiceProvider._id }, { $set: { authentication, stripeCustomerId: stripeCustomer.id } });
//      // return createServiceProvider;

//      const stripe_account_onboarding_url = await stripeAccountService.createConnectedStripeAccount(createServiceProvider, host, protocol);

//      return { user: createServiceProvider, stripe_account_onboarding_url };
// };

// create Admin

const createAdminToDB = async (payload: Partial<IUser>): Promise<IUser> => {
     //set role
     payload.role = USER_ROLES.ADMIN;
     const createAdmin = await User.create(payload);
     if (!createAdmin) {
          throw new AppError(StatusCodes.BAD_REQUEST, 'Failed to create admin');
     }

     //send email
     const otp = generateOTP(4);
     const values = {
          name: createAdmin.full_name,
          otp: otp,
          email: createAdmin.email!,
     };
     const createAccountTemplate = emailTemplate.createAccount(values);
     emailHelper.sendEmail(createAccountTemplate);

     //save to DB
     const authentication = {
          oneTimeCode: otp,
          expireAt: new Date(Date.now() + 3 * 60000),
     };
     await User.findOneAndUpdate({ _id: createAdmin._id }, { $set: { authentication } });

     return createAdmin;
};

// get user profile
const getUserProfileFromDB = async (user: JwtPayload): Promise<Partial<IUser>> => {
     const { id } = user;
     const isExistUser = await User.isExistUserById(id);
     if (!isExistUser) {
          throw new AppError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
     }

     return isExistUser;
};

// update user profile
const updateProfileToDB = async (user: JwtPayload, payload: Partial<IUser>): Promise<Partial<IUser | null>> => {
     // if user.role is service provider and trying to update own adminRevenuePercent then throw error
     if (user.role === USER_ROLES.SERVICE_PROVIDER && payload.adminRevenuePercent) {
          //unlink file here
          if (payload.image) {
               unlinkFile(payload.image);
          }
          throw new AppError(StatusCodes.BAD_REQUEST, 'Service provider cannot update adminRevenuePercent');
     }
     const { id } = user;
     const isExistUser = await User.isExistUserById(id);
     if (!isExistUser) {
          //unlink file here
          if (payload.image) {
               unlinkFile(payload.image);
          }
          throw new AppError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
     }

     //unlink file here
     if (payload.image && isExistUser.image) {
          unlinkFile(isExistUser.image);
     }

     const updateDoc = await User.findOneAndUpdate({ _id: id }, payload, {
          new: true,
     });

     return updateDoc;
};

const verifyUserPassword = async (userId: string, password: string) => {
     const user = await User.findById(userId).select('+password');
     if (!user) {
          throw new AppError(StatusCodes.NOT_FOUND, 'User not found.');
     }
     const isPasswordValid = await User.isMatchPassword(password, user.password);
     return isPasswordValid;
};
const deleteUser = async (id: string) => {
     const isExistUser = await User.isExistUserById(id);
     if (!isExistUser) {
          throw new AppError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
     }

     if (isExistUser.adminDueAmount > 0) {
          throw new AppError(StatusCodes.BAD_REQUEST, `User can't be deleted! Have a due to admin amount ${isExistUser.adminDueAmount}`);
     }

     const activeBookingsOfUser = await Booking.find({ user: id, status: { $in: [BOOKING_STATUS.ON_THE_WAY, BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.WORK_STARTED] } });
     if (activeBookingsOfUser.length > 0) {
          throw new AppError(StatusCodes.BAD_REQUEST, `User can't be deleted! Have active bookings ${activeBookingsOfUser.length}`);
     }

     const activeBidsOfUser = await Bid.find({ serviceProvider: id, status: { $in: [BID_STATUS.ON_THE_WAY, BID_STATUS.ACCEPTED, BID_STATUS.WORK_STARTED] } });
     if (activeBidsOfUser.length > 0) {
          throw new AppError(StatusCodes.BAD_REQUEST, `User can't be deleted! Have active bids ${activeBidsOfUser.length}`);
     }

     await User.findByIdAndUpdate(id, {
          $set: { isDeleted: true },
     });

     return true;
};

const getAllRoleBasedUser = async () => {
     const result = await User.find({}, { _id: 1, role: 1, full_name: 1, email: 1 }).lean();

     const users = result.reduce<Record<USER_ROLES, { data: (typeof result)[0][]; count: number }>>(
          (acc, curr) => {
               const { role } = curr;

               // Ensure TypeScript understands the structure of acc
               if (acc[role]) {
                    acc[role].data.push(curr);
                    acc[role].count += 1;
               } else {
                    acc[role] = { count: 1, data: [curr] };
               }

               return acc;
          },
          {} as Record<USER_ROLES, { data: (typeof result)[0][]; count: number }>,
     );

     return users;
};

const updateUserByIdToDB = async (id: string, payload: Partial<IUser>) => {
     // const isExistUser = await User.isExistUserById(id);
     // if (!isExistUser) {
     //      throw new AppError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
     // }

     const updateDoc = await User.findOneAndUpdate({ _id: id }, payload, {
          new: true,
     });

     return updateDoc;
};

const toggleUserStatus = async (id: string) => {
     const isExistUser = await User.isExistUserById(id);

     if (!isExistUser) {
          const updateDoc = await User.findOneAndUpdate(
               { _id: id },
               { $set: { status: 'active' } },
               {
                    new: true,
               },
          );
          return updateDoc;
     }

     const updateDoc = await User.findOneAndUpdate(
          { _id: id },
          { $set: { status: isExistUser.status === 'active' ? 'blocked' : 'active' } },
          {
               new: true,
          },
     );

     return updateDoc;
};

export const UserService = {
     createUserToDB,
     createServiceProviderToDB,
     getUserProfileFromDB,
     updateProfileToDB,
     createAdminToDB,
     deleteUser,
     verifyUserPassword,
     getAllRoleBasedUser,
     updateUserByIdToDB,
     toggleUserStatus,
};
