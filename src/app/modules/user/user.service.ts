import { StatusCodes } from 'http-status-codes';
import { JwtPayload } from 'jsonwebtoken';
import config from '../../../config';
import AppError from '../../../errors/AppError';
import { emailHelper } from '../../../helpers/emailHelper';
import { emailTemplate } from '../../../shared/emailTemplate';
import unlinkFile from '../../../shared/unlinkFile';
import generateOTP from '../../../utils/generateOTP';
import stripe from '../../config/stripe.config';
import { ServiceCategory } from '../ServiceCategory/ServiceCategory.model';
import { stripeAccountService } from '../stripeAccount/stripeAccount.service';
import { USER_ROLES } from './user.enums';
import { IUser } from './user.interface';
import { User } from './user.model';
// create user
const createUserToDB = async (payload: IUser): Promise<IUser> => {
     //set role
     const user = await User.isExistUserByEmail(payload.email);
     if (user) {
          throw new AppError(StatusCodes.CONFLICT, 'Email already exists');
     }
     payload.role = USER_ROLES.USER;
     const createUser = await User.create(payload);
     if (!createUser) {
          throw new AppError(StatusCodes.BAD_REQUEST, 'Failed to create account');
     }

     //send email
     const otp = generateOTP(4);
     const values = {
          name: createUser.full_name,
          otp: otp,
          email: createUser.email!,
     };
     const createAccountTemplate = emailTemplate.createAccount(values);
     emailHelper.sendEmail(createAccountTemplate);

     //save to DB
     const authentication = {
          oneTimeCode: otp,
          expireAt: new Date(Date.now() + Number(config.otp.otpExpiryTimeInMin) * 60000),
     };
     await User.findOneAndUpdate({ _id: createUser._id }, { $set: { authentication } });

     let stripeCustomer;
     try {
          stripeCustomer = await stripe.customers.create({
               email: createUser.email,
               name: createUser.full_name,
          });
     } catch (error) {
          console.log('🚀 ~ createUserToDB ~ error:', error);
          throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to create Stripe customer');
     }

     createUser.stripeCustomerId = stripeCustomer.id;
     await User.findOneAndUpdate({ _id: createUser._id }, { $set: { authentication, stripeCustomerId: stripeCustomer.id } });
     return createUser;
};
const createServiceProviderToDB = async (payload: IUser, host: string, protocol: string): Promise<IUser | any> => {
     //set role
     const user = await User.isExistUserByEmail(payload.email);
     if (user) {
          throw new AppError(StatusCodes.CONFLICT, 'Email already exists');
     }
     payload.role = USER_ROLES.SERVICE_PROVIDER;
     // handl is exist serviceCategory
     const serviceCategory = await ServiceCategory.findById(payload.serviceCategory);
     if (!serviceCategory) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Service category not found');
     }
     const createServiceProvider = await User.create(payload);
     if (!createServiceProvider) {
          throw new AppError(StatusCodes.BAD_REQUEST, 'Failed to create account');
     }

     //send email
     const otp = generateOTP(4);
     const values = {
          name: createServiceProvider.full_name,
          otp: otp,
          email: createServiceProvider.email!,
     };
     const createAccountTemplate = emailTemplate.createAccount(values);
     emailHelper.sendEmail(createAccountTemplate);

     //save to DB
     const authentication = {
          oneTimeCode: otp,
          expireAt: new Date(Date.now() + Number(config.otp.otpExpiryTimeInMin) * 60000),
     };
     await User.findOneAndUpdate({ _id: createServiceProvider._id }, { $set: { authentication } });

     let stripeCustomer;
     try {
          stripeCustomer = await stripe.customers.create({
               email: createServiceProvider.email,
               name: createServiceProvider.full_name,
          });
     } catch (error) {
          console.log('🚀 ~ createUserToDB ~ error:', error);
          throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to create Stripe customer');
     }

     createServiceProvider.stripeCustomerId = stripeCustomer.id;
     await User.findOneAndUpdate({ _id: createServiceProvider._id }, { $set: { authentication, stripeCustomerId: stripeCustomer.id } });
     // return createServiceProvider;    

     const stripe_account_onboarding_url = await stripeAccountService.createConnectedStripeAccount(createServiceProvider, host, protocol);

     return { user: createServiceProvider, stripe_account_onboarding_url };
};

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
     const { id } = user;
     const isExistUser = await User.isExistUserById(id);
     if (!isExistUser) {
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

     await User.findByIdAndUpdate(id, {
          $set: { isDeleted: true },
     });

     return true;
};

const getAllRoleBasedUser = async () => {
     const result = await User.find({}, { _id: 1, role: 1, name: 1, email: 1 }).lean();

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
     const isExistUser = await User.isExistUserById(id);
     if (!isExistUser) {
          throw new AppError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
     }

     const updateDoc = await User.findOneAndUpdate({ _id: id }, payload, {
          new: true,
     });

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
};
