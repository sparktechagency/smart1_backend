import bcrypt from 'bcrypt';
import { StatusCodes } from 'http-status-codes';
import { model, Schema } from 'mongoose';
import config from '../../../config';
import AppError from '../../../errors/AppError';
import { DEFAULT_ADMIN_REVENUE } from '../Bid/Bid.enum';
import { USER_ROLES } from './user.enums';
import { IUser, UserModel } from './user.interface';

// Define the user schema
const userSchema = new Schema<IUser, UserModel>(
     {
          googleId: {
               type: String,
               default: '',
               // unique: true,
               required: false,
          },
          facebookId: {
               type: String,
               default: '',
               // unique: true,
               required: false,
          },
          provider: {
               type: String,
               default: '',
               required: false,
          },
          full_name: {
               type: String,
               required: true,
               trim: true,
          },
          businessName: {
               type: String,
               trim: true,
          }, // for provider
          serviceCategories: {
               type: [String],
               trim: true,
          }, // for provider
          role: {
               type: String,
               enum: Object.values(USER_ROLES),
               default: USER_ROLES.USER,
          },
          email: {
               type: String,
               required: true,
               unique: true,
               lowercase: true,
               index: true,
          },
          password: {
               type: String,
               required: false,
               select: false,
               minlength: 8,
          },
          image: {
               type: String,
               default: '',
          },
          phone: {
               type: String,
               default: '',
          },
          address: {
               type: Schema.Types.Mixed, // Allows both object or string
               validate: {
                    validator: function (value) {
                         if (typeof value === 'string') {
                              return true; // Allow if it's a string
                         }
                         if (typeof value === 'object' && value !== null) {
                              // Use Object.prototype.hasOwnProperty.call() to avoid the ESLint warning
                              return (
                                   Object.prototype.hasOwnProperty.call(value, 'province') ||
                                   Object.prototype.hasOwnProperty.call(value, 'territory') ||
                                   Object.prototype.hasOwnProperty.call(value, 'city') ||
                                   Object.prototype.hasOwnProperty.call(value, 'country') ||
                                   Object.prototype.hasOwnProperty.call(value, 'detail_address')
                              );
                         }
                         return false; // Invalid if not a string or object with optional fields
                    },
                    message: 'Address must be either a string or an object with optional fields',
               },
               required: false, // The address field itself is optional
          },
          businesses: [
               {
                    type: Schema.Types.ObjectId,
                    ref: 'Business',
               },
          ],

          joinDate: {
               type: Date,
               default: Date.now,
          },
          status: {
               type: String,
               enum: ['active', 'blocked'],
               default: 'active',
          },
          blockedAt: {
               type: Date,
          },
          verified: {
               type: Boolean,
               default: false,
          },
          isDeleted: {
               type: Boolean,
               default: false,
          },
          stripeCustomerId: {
               type: String,
               default: '',
          },
          stripeConnectedAccount: {
               type: String,
               default: '',
          },
          tokenVersion: {
               type: Number,
               default: 0,
          },
          lastLogin: { type: Date },
          loginCount: { type: Number, default: 0 }, // Track total logins (1 per day)
          authentication: {
               type: {
                    isResetPassword: {
                         type: Boolean,
                         default: false,
                    },
                    oneTimeCode: {
                         type: Number,
                         default: null,
                    },
                    expireAt: {
                         type: Date,
                         default: null,
                    },
               },
               select: false,
          },
          balance: { type: Number, default: 0 },
          geoLocation: {
               type: {
                    type: String,
                    enum: ['Point'],
                    default: 'Point',
               },
               coordinates: {
                    type: [Number],
                    default: [0, 0],
                    index: '2dsphere',
               },
          },
          paymentCards: [
               {
                    type: Schema.Types.ObjectId,
                    ref: 'PaymentCard',
               },
          ],
          adminRevenuePercent: { type: Number, default: DEFAULT_ADMIN_REVENUE },
          adminDueAmount: { type: Number, default: 0 }, // Amount due to admin
          bookingCancelCount: { type: Number, default: 0 },
          reviews: [{ type: Schema.Types.ObjectId, ref: 'Reviews', default: [] }],
          avgRating: {
               type: Number,
               required: true,
               min: 0,
               default: 0,
          },
          reviewsCount: { type: Number, default: 0 },
     },
     { timestamps: true },
);

// Create a 2dsphere index for geoLocation
userSchema.index({ geoLocation: '2dsphere' });

// Exist User Check
userSchema.statics.isExistUserById = async (id: string) => {
     return await User.findById(id);
};
// Static function to check if a user exists by email
userSchema.statics.isExistUserByEmail = async (email: string) => {
     return await User.findOne({ email });
};

// Static function to check if a user exists by phone
userSchema.statics.isExistUserByPhone = async (phone: string) => {
     return await User.findOne({ phone });
};
// Password Matching
userSchema.statics.isMatchPassword = async (password: string, hashPassword: string): Promise<boolean> => {
     return await bcrypt.compare(password, hashPassword);
};

// Static function to check if a user is in free trial
// userSchema.statics.isInFreeTrial = async (userId: string) => {
//      const user = await User.findById(userId);
//      if (!user) throw new AppError(StatusCodes.NOT_FOUND, 'User not found');
//      return user.isFreeTrial && user.trialExpireAt > new Date();
// };

// // Static function to check if the user's subscription is active
// userSchema.statics.hasActiveSubscription = async (userId: string) => {
//      const user = await User.findById(userId);
//      if (!user) throw new AppError(StatusCodes.NOT_FOUND, 'User not found');
//      return user.hasAccess;
// };

// // Static function to check if the user's free trial has expired
// userSchema.statics.hasTrialExpired = async (userId: string) => {
//      const user = await User.findById(userId);
//      if (!user) throw new AppError(StatusCodes.NOT_FOUND, 'User not found');
//      return user.trialExpireAt < new Date();
// };

// Pre-save hook to hash the user's password and check email uniqueness
userSchema.pre('save', async function (next) {
     const isExist = await User.findOne({ email: this.get('email') });
     if (isExist) {
          throw new AppError(StatusCodes.BAD_REQUEST, 'Email already exists!');
     }

     // this.password = await bcrypt.hash(this.password, Number(config.bcrypt_salt_rounds));

     // Only hash the password if it's set (i.e., not null or empty)
     if (this.password && this.isModified('password')) {
          this.password = await bcrypt.hash(this.password, Number(config.bcrypt_salt_rounds));
     }
     next();
});

// Query Middleware to exclude deleted users
userSchema.pre('find', function (next) {
     this.find({ isDeleted: { $ne: true } });
     next();
});

userSchema.pre('findOne', function (next) {
     this.find({ isDeleted: { $ne: true }, status: { $ne: 'blocked' } });
     next();
});

userSchema.pre('aggregate', function (next) {
     this.pipeline().unshift({ $match: { isDeleted: { $ne: true }, status: { $ne: 'blocked' } } });
     next();
});

// Export the user model
export const User = model<IUser, UserModel>('User', userSchema);
