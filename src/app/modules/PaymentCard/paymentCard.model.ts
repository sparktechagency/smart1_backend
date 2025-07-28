import bcrypt from 'bcrypt';
import { StatusCodes } from 'http-status-codes';
import { model, Schema } from 'mongoose';
import config from '../../../config';
import AppError from '../../../errors/AppError';
import { IPaymentCard, PaymentCardModel } from './paymentCard.interface';

const paymentCardSchema = new Schema<IPaymentCard>(
     {
          user: {
               type: Schema.Types.ObjectId,
               ref: 'User',
               required: [true, 'User ID is required'],
          },
          description: {
               type: String,
               required: [true, 'Description is required'],
          },
          cvvNo: {
               type: String,
               required: [true, 'CVV number is required'],
          },
          cardExpiryDate: {
               type: Date,
               required: [true, 'Card expiry date is required'],
          },
          cardNo: {
               type: String,
               required: false,
               select: false,
               minlength: 8,
               unique: true,
          },
          isDeleted: {
               type: Boolean,
               default: false,
          },
          deletedAt: {
               type: Date,
          },
     },
     {
          timestamps: true,
          toJSON: {
               getters: true,
          },
     },
);


// CardNo Matching
paymentCardSchema.statics.isMatchCardNo = async (cardNo: string, hashCardNo: string): Promise<boolean> => {
     return await bcrypt.compare(cardNo, hashCardNo);
};



// Pre-save hook to hash the user's cardNo and check email uniqueness
paymentCardSchema.pre('save', async function (next) {
     const isExist = await PaymentCard.findOne({ cardNo: this.get('cardNo') });
     if (isExist) {
          throw new AppError(StatusCodes.BAD_REQUEST, 'Card Number already exists!');
     }

     // validate cardExpiryDate 
     if (this.cardExpiryDate && this.isModified('cardExpiryDate')) {
          const today = new Date();
          if (this.cardExpiryDate < today) {
               throw new AppError(StatusCodes.BAD_REQUEST, 'Card expiry date is invalid!');
          }
     }

     // Only hash the cardNo if it's set (i.e., not null or empty)
     if (this.cardNo && this.isModified('cardNo')) {
          this.cardNo = await bcrypt.hash(this.cardNo, Number(config.bcrypt_salt_rounds));
     }
     next();
});



paymentCardSchema.pre('find', function (next) {
     this.find({ isDeleted: false });
     next();
});

paymentCardSchema.pre('findOne', function (next) {
     this.findOne({ isDeleted: false });
     next();
});

paymentCardSchema.pre('aggregate', function (next) {
     this.pipeline().unshift({ $match: { isDeleted: { $ne: true } } });
     next();
});

export const PaymentCard = model<IPaymentCard, PaymentCardModel>('PaymentCard', paymentCardSchema);
