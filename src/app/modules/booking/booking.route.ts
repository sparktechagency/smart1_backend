import { Router } from 'express';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { USER_ROLES } from '../user/user.enums';
import { BookingController } from './booking.controller';
import { BookingValidation } from './booking.validation';

const router = Router();

// Define routes

router.get('/my-bookings', auth(USER_ROLES.USER), BookingController.getMyBooking);

router.post('/create', validateRequest(BookingValidation.createBookingSchema), auth(USER_ROLES.USER), BookingController.createBooking);

/**
 * 1. booking create হবার সময় serviceCategory id সহ
 * 2. সাথে সাথে serviceCategory এর against এ যারা যারা bid offer (within 2km destination distance) করেছে তাদের কাছে notification পাঠিয়ে দেওয়া হবে+already(serviceCategory এর against এ) যেই যেই previous bid offers গুলো আছে সেগুলো দেখানো হবে user কে. user চাইলে সেখান থেকে যেকোন একটা bid accepte করে বুকিং করতে পারে অথবা skip করে বুকিং করতে পারে
 * তার পর my booking page এ গিয়ে সে তার booking details দেখতে পারবে + চাইলে এখন সে আবারো booking.serviceCategory তে যেই যেই previous bid offers গুলো আছে সেগুলো দেখতে পারবে ও চাইলে যেকোন bid accept করতে পারবে (যদি আগে bid না accept করে থাকে) অথবা আগের bid change করতে পারবে তবে কিছু শর্তে সাপেক্ষে। যেমন, bookingDate + bookingTime যদি আজকের না হয় অথবা booking.status > confirmed না হয়
*/


// router.get('/bid/:serviceId', auth(USER_ROLES.USER), BookingController.getAllBidsByServiceId);

// router.patch('/bid/:bookingId', validateRequest(BookingValidation.acceptBidForBookingSchema), auth(USER_ROLES.USER), BookingController.acceptBid);

router.get('/refund-booking-requests/:shopId', auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN), BookingController.getAllRefundBookingRequests);

router.post('/refund/:bookingId', auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN), BookingController.refundBooking);

router.patch('/status/:bookingId', auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN), validateRequest(BookingValidation.updateBookingStatusSchema), BookingController.changeBookingStatus);

// Cancel booking
router.delete('/cancel/:id', auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN), BookingController.cancelBooking);

router.get('/:bookingId', auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.USER), BookingController.getBookingDetails);

export const BookingRoutes = router;
