import { StatusCodes } from 'http-status-codes';
import { Schema, model } from 'mongoose';
import AppError from '../../../errors/AppError';
import { DEFAULT_ADMIN_REVENUE } from '../Bid/Bid.enum';
import { Bid } from '../Bid/Bid.model';
import { COUPON_DISCOUNT_TYPE } from '../coupon/coupon.enums';
import { Coupon } from '../coupon/coupon.model';
import { Service } from '../Service/Service.model';
import { ServiceCategory } from '../ServiceCategory/ServiceCategory.model';
import { BOOKING_STATUS, PAYMENT_METHOD, PAYMENT_STATUS } from './booking.enums';
import { IBooking } from './booking.interface';

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
                    }
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
               default: BOOKING_STATUS.PENDING,
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
          images: {
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
          adminRevenuePercent: {
               type: Number,
               required: true,
               default: DEFAULT_ADMIN_REVENUE,
          },
          isPaymentTransferd: {
               type: Boolean,
               default: false,
          },
          paymentMethod: {
               type: String,
               enum: PAYMENT_METHOD,
               default: PAYMENT_METHOD.UNSPECIFIED,
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
     let bid = null;

     // booking service category
     const serviceCategory = await ServiceCategory.findById(booking.serviceCategory);
     if (!serviceCategory) {
          return next(new AppError(StatusCodes.BAD_REQUEST, "Service category not found. from BookingModel"));
     }

     // Step 1: Initialize total amount
     let totalAmount = 0;
     let finalDiscountAmountFlat = 0;
     let acceptedProviderBidRate = 0;


     booking.adminRevenuePercent = DEFAULT_ADMIN_REVENUE;


     // Step 2: Calculate total amount for services
     if (booking.acceptedBid && booking.acceptedBid !== null) {
          // Step 2: Fetch the accepted bid using the bidId in booking
          bid = await Bid.findById(booking.acceptedBid); // Fetch the bid object using acceptedBid
          if (!bid) {
               return next(new AppError(StatusCodes.BAD_REQUEST, "Accepted bid not found from BookingModel"));
          }

          acceptedProviderBidRate = bid.rate; // Get the flat rate from the accepted bid
          booking.serviceProvider = bid.serviceProvider;
          booking.adminRevenuePercent = bid.revenue;
          totalAmount = acceptedProviderBidRate;
          console.log("booking.acceptedBid done acceptedProviderBidRate == totalAmount from BookingModel", acceptedProviderBidRate);
          let totalOfferPrice = 0;

          // if provider offers any offer
          for (let item of booking.services) {
               const service = await Service.findOne({ _id: item.service, serviceCategory: serviceCategory._id });

               if (!service) {
                    return next(new AppError(StatusCodes.BAD_REQUEST, `service not found!. from BookingModel`));
               }
               console.log("booking.acceptedBid done from BookingModel", "service name", service.name, "serviceCharge", service.serviceCharge);
               let offerPrice = (await service.calculateOfferPrice(bid.serviceProvider)) || 0;
               console.log("offerPrice for service from BookingModel", "service name", service.name, "offerPrice", offerPrice);
               let serviceCharge: number = offerPrice;
               const price = serviceCharge * item.quantity;
               totalOfferPrice += price;
          }
          totalAmount = Math.min(totalAmount, totalOfferPrice);
          console.log("totalAmount for offerdservices from BookingModel", totalAmount);
     } else {
          for (let item of booking.services) {
               const service = await Service.findOne({ _id: item.service, serviceCategory: serviceCategory._id });

               if (!service) {
                    return next(new AppError(StatusCodes.BAD_REQUEST, `service not found!. from BookingModel`));
               }
               console.log("service for no offer and no acceptedbid from BookingModel", service.name, service.serviceCharge);

               let serviceCharge: number = service.serviceCharge;
               const price = serviceCharge * item.quantity;
               totalAmount += price;
          }
          console.log("totalAmount for no offer and no acceptedbid from BookingModel", totalAmount);
     }


     if (booking.coupon) {
          const coupon = await Coupon.findById(booking.coupon);
          if (coupon && coupon.isActive) {
               if (coupon?.minOrderAmount && totalAmount >= coupon?.minOrderAmount) {
                    if (coupon.discountType === COUPON_DISCOUNT_TYPE.PERCENTAGE) {
                         console.log("coupon discount in percentage and adminRevenuePercent from BookingModel", coupon.discountValue, booking.adminRevenuePercent);
                         // handle admin revenue percentage > coupon discount value
                         if (booking.adminRevenuePercent > coupon.discountValue) {
                              booking.adminRevenuePercent = booking.adminRevenuePercent - coupon.discountValue
                         } else {
                              throw new AppError(StatusCodes.BAD_REQUEST, 'Coupon discount value is greater than admin default revenue percentage. from BookingModel');
                         }
                         finalDiscountAmountFlat = Math.min((coupon.discountValue / 100) * totalAmount, coupon.maxDiscountAmount ? coupon.maxDiscountAmount : Infinity);
                    } else if (coupon.discountType === COUPON_DISCOUNT_TYPE.FLAT) {
                         let finalDiscountAmountPercent = (coupon.discountValue * 100) / totalAmount;
                         console.log("coupon discount in flat and adminRevenuePercent from BookingModel", coupon.discountValue, booking.adminRevenuePercent);
                         if (finalDiscountAmountPercent > booking.adminRevenuePercent) {
                              throw new AppError(StatusCodes.BAD_REQUEST, 'Coupon discount value is greater than admin default revenue percentage. from BookingModel');
                         }
                         booking.adminRevenuePercent = booking.adminRevenuePercent - finalDiscountAmountPercent;
                         console.log("coupon discount in flat and adminRevenuePercent after from BookingModel", coupon.discountValue, booking.adminRevenuePercent);
                         finalDiscountAmountFlat = Math.min(coupon.discountValue, totalAmount);
                    }
               }

               //  * first check coupon usage limit exceeded or not
               //  * if yes then throw error
               if (coupon.usageLimit && coupon.usageLimit <= coupon.usedCount) {
                    throw new AppError(StatusCodes.BAD_REQUEST, 'Coupon usage limit exceeded. from BookingModel');
               }
               //  * second check user have already used coupon or not 
               //  * if not set count vaule 1 for the user
               //  * if yes check userUsageLimitPerUser exists or not
               //  * * if userUsageLimitPerUser exists then check if he used less than userUsageLimitPerUser or not 
               //  * * * if yes then increase the count by 1 and finally increase the usedCount by 1
               //  * * * if no then throw error
               //  * * if userUsageLimitPerUser not exists then increase the count by 1 and finally increase the usedCount by 1

               const isAlreadyCouponUsedCountByThisUser = coupon.couponUsedCountByUser.find((couponUser) => couponUser.user.toString() === booking.user.toString());
               if (isAlreadyCouponUsedCountByThisUser) {
                    if (coupon.userUsageLimitPerUser) {
                         if (isAlreadyCouponUsedCountByThisUser.count < coupon.userUsageLimitPerUser) {
                              await Coupon.updateOne({ _id: coupon._id }, { couponUsedCountByUser: { user: booking.user.toString(), count: isAlreadyCouponUsedCountByThisUser.count + 1 }, usedCount: coupon.usedCount + 1 });
                         } else {
                              throw new AppError(StatusCodes.BAD_REQUEST, 'You have already used this coupon. from BookingModel');
                         }
                    } else {
                         await Coupon.updateOne({ _id: coupon._id }, { couponUsedCountByUser: { user: booking.user.toString(), count: isAlreadyCouponUsedCountByThisUser.count + 1 }, usedCount: coupon.usedCount + 1 });
                    }
               } else {
                    await Coupon.updateOne({ _id: coupon._id }, { couponUsedCountByUser: { user: booking.user.toString(), count: 1 }, usedCount: coupon.usedCount + 1 });
               }

          }
     }


     booking.totalAmount = totalAmount;
     booking.discount = finalDiscountAmountFlat;
     booking.finalAmount = totalAmount - finalDiscountAmountFlat;
     console.log("booking totalAmount, discount, finalAmount from BookingModel", booking.totalAmount, booking.discount, booking.finalAmount);
     next();
});


// bookingSchema.methods.calculateAllKindOfAmounts = async function (acceptedBid: Types.ObjectId) {

export const Booking = model<IBooking>('Booking', bookingSchema);
