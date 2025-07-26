import express from 'express';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { USER_ROLES } from '../user/user.enums';
import { BidController } from './Bid.controller';
import { BidValidation } from './Bid.validation';

const router = express.Router();

router.post('/', auth(USER_ROLES.SERVICE_PROVIDER), validateRequest(BidValidation.createBidZodSchema), BidController.createBid);

router.get('/', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), BidController.getAllBids); // need to modify

router.get('/unpaginated', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), BidController.getAllUnpaginatedBids); // need to modify

router.get('/booking/:bookingId', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.USER, USER_ROLES.SERVICE_PROVIDER), BidController.getAllBidsByBookingId); // to accept as user and to watch as service provider

router.delete('/hard-delete/:id', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), BidController.hardDeleteBid); // need to modify
// change status
router.patch('/status/:id', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.SERVICE_PROVIDER), validateRequest(BidValidation.changeBidStatusZodSchema), BidController.changeBidStatus); // need to modify

router.patch('/rate/:id', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.SERVICE_PROVIDER), validateRequest(BidValidation.updateRateBidZodSchema), BidController.updateBidRate); // need to modify

router.delete('/:id', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), BidController.deleteBid); // need to modify

router.get('/:id', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.SERVICE_PROVIDER), BidController.getBidById); // need to modify

export const BidRoutes = router;
