import { Model, Schema } from 'mongoose';
import { USER_ROLES } from './user.enums';



export interface IGeoLocation {
     type: 'Point';
     coordinates: [number, number]; // [longitude, latitude]
}

export type IUser = {
     googleId?: string;
     facebookId?: string;
     provider?: string;
     full_name: string;
     businessName?: string; // for provider
     serviceCategory?: string; // for provider
     role: USER_ROLES;
     email: string;
     password: string;
     image?: string;
     phone?: string;
     joinDate: Date;
     isDeleted: boolean;
     address?:
     | {
          province: string;
          territory: string;
          city: string;
          country?: string;
          detail_address?: string;
     }
     | string;
     businesses: Schema.Types.ObjectId[];
     lastLogin: Date;
     tokenVersion: number;
     loginCount: number;
     stripeCustomerId: string;
     stripeConnectedAccount?: string;
     status: 'active' | 'blocked';
     verified: boolean;
     authentication?: {
          isResetPassword: boolean;
          oneTimeCode: number;
          expireAt: Date;
     };
     balance: number;
     geoLocation?: IGeoLocation;
     paymentCards: Schema.Types.ObjectId[]
     adminRevenuePercent: number
};

export type UserModel = {
     isExistUserById(id: string): any;
     isExistUserByEmail(email: string): any;
     isExistUserByPhone(contact: string): any;
     isMatchPassword(password: string, hashPassword: string): boolean;
     isInFreeTrial(userId: string): Promise<boolean>;
     hasActiveSubscription(userId: string): Promise<boolean>;
     hasTrialExpired(userId: string): Promise<boolean>;
} & Model<IUser>;

export type ISellerUser = IUser & {
     store_name: string;
     store_category: string;
};
