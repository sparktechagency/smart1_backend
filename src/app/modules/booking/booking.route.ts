import { Router } from 'express';
import { FOLDER_NAMES } from '../../../enums/files';
import auth from '../../middleware/auth';
import fileUploadHandler from '../../middleware/fileUploadHandler';
import parseMultipleFilesdata from '../../middleware/parseMultipleFilesdata';
import validateRequest from '../../middleware/validateRequest';
import { USER_ROLES } from '../user/user.enums';
import { BookingController } from './booking.controller';
import { BookingValidation } from './booking.validation';

const router = Router();

// Define routes

router.get('/my-bookings', auth(USER_ROLES.USER, USER_ROLES.SERVICE_PROVIDER), BookingController.getMyBooking);

/**
 * * booking create করার জন্য, data গুলো validate করবে booking model এর pre validate মেথড
 * * check করব serviceCategory exist করে কিনা
 * * এবার totalAmount বের করব
 * * * এবার booking data তে যদি booking.acceptedBid না থাকে,
 * * * * তাহলে booking.services এর সব service গুলো থেকে serviceCharge দিয়ে totalAmount বের করব
 * * * * defaultBookingRange এর মান হিসেবে booking.geoLocationOfDestination  এর মধ্যে 10km যে সব providers আছে তাদের কাছে notification
 * * * এবার booking data তে যদি booking.acceptedBid থাকে,
 * * * * তাহলে Bid এক্সিস্ট করে কিনা
 * * * * * যদি exis করে তাহলে
 * * * * * * booking.serviceProvider = bid.serviceProvider;
 * * * * * * booking.adminRevenuePercent = bid.revenue;
 * * * * * * totalAmount = acceptedProviderBidRate;
 * * * * * * এবার check করব provider এই booking এর কোন একটা booking এর জন্য কোন offer করেছে কিনা,
 * * * * * * * যদি কোন offer করেছে তাহলে
 * * * * * * * * সেই সেই service গুলোর offer price বের করে আনব
 * * * * * * * * এবার সব service গুলোর offer price দিয়ে totalAmount বের করব
 * * এবার দেখব bookingdata.coupon আছে কিনা
 * * * যদি আছে তাহলে coupon exist করে কিনা ও isActive true কিনা
 * * * * যদি আছে তাহলে coupon discountType যদি percentage হয় তাহলে
 * * * * * তাহলে booking.adminRevenuePercent থেকে coupon.discountValue বেশি হলে
 * * * * * * error দিব
 * * * * * আর যদি কম হলে এ বুকিং এর জন্য admin এর revenu% কমিয়ে দিব
 * * * * * * booking.adminRevenuePercent = booking.adminRevenuePercent - coupon.discountValue set করব
 * * * * * * finalDiscountAmountFlat বের করব
 * * * * coupon discountType যদি flat হয় তাহলে
 * * * * * Flat discount value কে % এ বের করে দেখব booking.adminRevenuePercent থেকে বেশি না কম
 * * * * * * বেশি হলে error দিব
 * * * * * * আর যদি কম হলে
 * * * * * * * booking.adminRevenuePercent = booking.adminRevenuePercent - finalDiscountAmountPercent;
 * * * * * * * finalDiscountAmountFlat বের করব
 * * * * usedCount,couponUsedCountByUser বের করব
 * * * booking.totalAmount = totalAmount;
 * * * booking.discount = finalDiscountAmountFlat;
 * * * booking.finalAmount = totalAmount - finalDiscountAmountFlat;
 * * * next();
 * * তাহলে booking.create হবে
 * * এবার createdBooking.acceptedBid না থাকলে
 * * * admins দের notify করে দিব + user কে email এ invoice পাঠিয়ে দিব
 * * এবার createdBooking.acceptedBid থাকলে
 * * * payment method যদি cash হয়,
 * * * * createdBooking এর informations use করে payment create করতে হবে,
 * * * * created payment কে booking এর payment field এ যোগ করতে হবে,
 * * * * service এর servedCount এর মান ১ বাড়াতে হবে,
 * * * * admins + bidder কে notification পাঠিয়ে দেওয়া হবে,
 * * * * generateBookingInvoicePDF করতে হবে,
 * * * * user কে bookingInvoice email পাঠিয়ে দেওয়া হবে,
 * * * payment method যদি online হয়,
 * * * * stripeCustomer id create করতে হবে ও তা user এর db তে update হবে,
 * * * * stripeSession create করতে হবে, সেখানে metadata হিসেবে payment create করতে যা যা দরকার সব দিয়ে দিতে হবে
 */

router.post('/', auth(USER_ROLES.USER), fileUploadHandler(), parseMultipleFilesdata(FOLDER_NAMES.IMAGE), validateRequest(BookingValidation.createBookingSchema), BookingController.createBooking);

//  * payment method যদি online হয়+booking.acceptedBid যদি থাকে, তাহলে web stripe hook generate হয়ে সেখানে booking+payment অ্যাড হবে,
//  * 1. booking create হবার সময় serviceCategory id সহ
//  * 2. সাথে সাথে serviceCategory এর against এ যারা যারা bid offer (within 2km destination distance) করেছে তাদের কাছে notification পাঠিয়ে দেওয়া হবে+already(serviceCategory এর against এ) যেই যেই previous bid offers গুলো আছে সেগুলো দেখানো হবে user কে. user চাইলে সেখান থেকে যেকোন একটা bid accepte করে বুকিং করতে পারে অথবা skip করে বুকিং করতে পারে
//  * তার পর my booking page এ গিয়ে সে তার booking details দেখতে পারবে + চাইলে এখন সে আবারো booking.serviceCategory তে যেই যেই previous bid offers গুলো আছে সেগুলো দেখতে পারবে ও চাইলে যেকোন bid accept করতে পারবে (যদি আগে bid না accept করে থাকে) অথবা আগের bid change করতে পারবে তবে কিছু শর্তে সাপেক্ষে। যেমন, bookingDate + bookingTime যদি আজকের না হয় অথবা booking.status > confirmed না হয়

//

//
//  *
//  * bid accept করার সময়,
//  * * payment method যদি cash হয়,
//  * * * createdBooking এর informations use করে payment create করতে হবে,
//  * * * created payment কে booking এর payment field এ যোগ করতে হবে,
//  * * * service এর servedCount এর মান ১ বাড়াতে হবে,
//  * * * admins + bidder কে notification পাঠিয়ে দেওয়া হবে,
//  * * * generateBookingInvoicePDF করতে হবে,
//  * * * user কে bookingInvoice email পাঠিয়ে দেওয়া হবে,
//  * * payment method যদি online হয়,
//  * * * stripeCustomer id create করতে হবে ও তা user এর db তে update হবে,
//  * * * stripeSession create করতে হবে, সেখানে metadata হিসেবে payment create করতে যা যা দরকার সব দিয়ে দিতে হবে

router.get('/bookings-for-provider', auth(USER_ROLES.SERVICE_PROVIDER), BookingController.getServiceCategoryBasedBookingsForProviderToBid);
router.get('/bids/service-category/:serviceCategoryId', auth(USER_ROLES.USER), BookingController.getServiceCategoryBasedBidsToAccept);
router.get('/bids/:bookingId', auth(USER_ROLES.USER), BookingController.getBidsOfBookingByIdToAccept);
router.patch('/bid/:bookingId', validateRequest(BookingValidation.acceptBidForBookingSchema), auth(USER_ROLES.USER), BookingController.acceptBid);
router.patch('/change-accepted-bid/:bookingId', validateRequest(BookingValidation.acceptBidForBookingSchema), auth(USER_ROLES.USER), BookingController.changeAcceptedBid); // untill the booking status is <=confirmed and bid status is <=accepted

router.patch('/status/:bookingId', auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN), validateRequest(BookingValidation.updateBookingStatusSchema), BookingController.changeBookingStatus);

// Cancel booking
router.delete('/cancel/:id', auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.USER, USER_ROLES.SERVICE_PROVIDER), validateRequest(BookingValidation.cancelBookingSchema), BookingController.cancelBooking);

router.get('/:bookingId', auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.USER, USER_ROLES.SERVICE_PROVIDER), BookingController.getBookingDetails);

export const BookingRoutes = router;
