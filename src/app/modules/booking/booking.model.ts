import { StatusCodes } from 'http-status-codes';
import { Schema, model } from 'mongoose';
import AppError from '../../../errors/AppError';
import { COUPON_DISCOUNT_TYPE } from '../coupon/coupon.enums';
import { Coupon } from '../coupon/coupon.model';
import { Service } from '../Service/Service.model';
import { BOOKING_STATUS, PAYMENT_METHOD, PAYMENT_STATUS } from './booking.enums';
import { IBooking } from './booking.interface';
import { Bid } from '../Bid/Bid.model';

const bookingSchema = new Schema<IBooking>(
     {
          user: {
               type: Schema.Types.ObjectId,
               ref: 'User',
               required: true,
          },
          serviceCategory: {
               type: Schema.Types.ObjectId,
               ref: 'ServiceCategory',
               required: true,
          },
          services: [
               {
                    service: {
                         type: Schema.Types.ObjectId,
                         ref: 'Service',
                         required: true,
                    },
                    quantity: {
                         type: Number,
                         required: true,
                         min: 1,
                    },
                    serviceCharge: {
                         type: Number,
                         required: true,
                    },
               },
          ],
          coupon: {
               type: Schema.Types.ObjectId,
               ref: 'Coupon',
               default: null,
          },
          totalAmount: {
               type: Number,
               required: true,
               min: 0,
          },
          discount: {
               type: Number,
               default: 0,
               min: 0,
          },
          finalAmount: {
               type: Number,
               required: true,
               min: 0,
          },
          status: {
               type: String,
               enum: BOOKING_STATUS,
               default: BOOKING_STATUS.CONFIRMED,
          },
          geoLocationOfDestination: {
               type: {
                    type: String,
                    enum: ['Point'],
                    default: 'Point',
               },
               coordinates: {
                    type: [Number],
                    default: [0, 0],
                    index: '2dsphere', // Creates the 2dsphere index for geospatial queries
               },
          },
          attachmentImages: {
               type: [String],
               default: [],
          },
          bookingDate: {
               type: Date,
               required: true,
          },
          bookingTime: {
               type: Date,
               required: true,
          },
          serviceProvider: {
               type: Schema.Types.ObjectId,
               ref: 'User',
               default: null,
          }, // এটা শুরু তে null থাকবে আর যখন user কারো bid accept করবে তখন সেই bidder এর id এখানে save হবে
          serviceTaskDetails: {
               type: String,
               required: true,
          },
          serviceTaskAdditionalInfo: {
               type: String,
               required: true,
          },
          bookingCancelReason: {
               type: String,
               required: false,
          },
          servicingDestination: {
               type: String,
               required: true,
          },
          acceptedBid: {
               type: Schema.Types.ObjectId,
               ref: 'Bid',
               default: null,
          },
          isDeleted: {
               type: Boolean,
               default: false,
          },
          deletedAt: {
               type: Date,
          },
          isPaymentTransferd: {
               type: Boolean,
               default: false,
          },
          paymentMethod: {
               type: String,
               enum: PAYMENT_METHOD,
               default: PAYMENT_METHOD.ONLINE,
          },
          paymentStatus: {
               type: String,
               enum: PAYMENT_STATUS,
               default: PAYMENT_STATUS.UNPAID,
          },
          payment: {
               type: Schema.Types.ObjectId,
               ref: 'Payment',
               default: null,
          },
          isNeedRefund: {
               type: Boolean,
               default: false,
          },
     },
     {
          timestamps: true,
     },
);

// middle to calculate total, discount, delivery charge, and final price for the booking based on the accepted bid
bookingSchema.pre('validate', async function (next) {
     const booking = this;

     // Step 1: Initialize total amount
     let totalAmount = 0;
     let finalDiscount = 0;
     // let acceptedProviderBidRate = 0;


     // Step 2: Calculate total amount for services
     for (let item of booking.services) {
          const service = await Service.findById(item.service);

          if (!service) {
               return next(new AppError(StatusCodes.BAD_REQUEST, `service not found!.`));
          }

          const offerPrice = (await service?.calculateOfferPrice()) || 0;

          let serviceCharge = service.serviceCharge;
          // acceptedBidRate && acceptedBidRate > 0 ? serviceCharge = acceptedBidRate : serviceCharge = service.serviceCharge;
          if (offerPrice && offerPrice > 0) {
               serviceCharge = Number(offerPrice)
          }

          item.serviceCharge = serviceCharge;
          const price = serviceCharge * item.quantity;
          totalAmount += price;
     }



     // if (booking.acceptedBid && booking.acceptedBid !== null) {
     //      // Step 2: Fetch the accepted bid using the bidId in booking
     //      const bid = await Bid.findById(booking.acceptedBid); // Fetch the bid object using acceptedBid
     //      if (!bid) {
     //           return next(new AppError(StatusCodes.BAD_REQUEST, "Accepted bid not found"));
     //      }

     //      acceptedProviderBidRate = bid.rate; // Get the flat rate from the accepted bid
     // }

     // if (booking.coupon) {
     //      const coupon = await Coupon.findById(booking.coupon);
     //      if (coupon && coupon.isActive) {
     //           if (coupon?.minOrderAmount && totalAmount >= coupon?.minOrderAmount) {
     //                if (coupon.discountType === COUPON_DISCOUNT_TYPE.PERCENTAGE) {
     //                     finalDiscount = Math.min((coupon.discountValue / 100) * totalAmount, coupon.maxDiscountAmount ? coupon.maxDiscountAmount : Infinity);
     //                } else if (coupon.discountType === COUPON_DISCOUNT_TYPE.FLAT) {
     //                     finalDiscount = Math.min(coupon.discountValue, totalAmount);
     //                }
     //           }

     //           //  * first check coupon usage limit exceeded or not
     //           //  * if yes then throw error
     //           if (coupon.usageLimit && coupon.usageLimit <= coupon.usedCount) {
     //                throw new AppError(StatusCodes.BAD_REQUEST, 'Coupon usage limit exceeded.');
     //           }
     //           //  * second check user have already used coupon or not 
     //           //  * if not set count vaule 1 for the user
     //           //  * if yes check userUsageLimitPerUser exists or not
     //           //  * * if userUsageLimitPerUser exists then check if he used less than userUsageLimitPerUser or not 
     //           //  * * * if yes then increase the count by 1 and finally increase the usedCount by 1
     //           //  * * * if no then throw error
     //           //  * * if userUsageLimitPerUser not exists then increase the count by 1 and finally increase the usedCount by 1

     //           const isAlreadyCouponUsedCountByThisUser = coupon.couponUsedCountByUser.find((couponUser) => couponUser.user.toString() === booking.user.toString());
     //           if (isAlreadyCouponUsedCountByThisUser) {
     //                if (coupon.userUsageLimitPerUser) {
     //                     if (isAlreadyCouponUsedCountByThisUser.count < coupon.userUsageLimitPerUser) {
     //                          await Coupon.updateOne({ _id: coupon._id }, { couponUsedCountByUser: { user: booking.user.toString(), count: isAlreadyCouponUsedCountByThisUser.count + 1 }, usedCount: coupon.usedCount + 1 });
     //                     } else {
     //                          throw new AppError(StatusCodes.BAD_REQUEST, 'You have already used this coupon.');
     //                     }
     //                } else {
     //                     await Coupon.updateOne({ _id: coupon._id }, { couponUsedCountByUser: { user: booking.user.toString(), count: isAlreadyCouponUsedCountByThisUser.count + 1 }, usedCount: coupon.usedCount + 1 });
     //                }
     //           } else {
     //                await Coupon.updateOne({ _id: coupon._id }, { couponUsedCountByUser: { user: booking.user.toString(), count: 1 }, usedCount: coupon.usedCount + 1 });
     //           }

     //      }
     // }

     booking.totalAmount = totalAmount;
     booking.discount = finalDiscount;
     booking.finalAmount = totalAmount - finalDiscount;
     next();
});


// bookingSchema.methods.calculateAllKindOfAmounts = async function (acceptedBid: Types.ObjectId) {

export const Booking = model<IBooking>('Booking', bookingSchema);
