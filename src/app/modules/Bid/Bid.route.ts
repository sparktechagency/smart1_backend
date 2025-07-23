import express from 'express';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { USER_ROLES } from '../user/user.enums';
import { BidController } from './Bid.controller';
import { BidValidation } from './Bid.validation';

const router = express.Router();

router.post('/', auth(USER_ROLES.SERVICE_PROVIDER), validateRequest(BidValidation.createBidZodSchema), BidController.createBid);

router.get('/', BidController.getAllBids); // need to modify

router.get('/unpaginated', BidController.getAllUnpaginatedBids); // need to modify

router.get('/serviceCategory/:serviceCategoryId', auth(USER_ROLES.SERVICE_PROVIDER, USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.USER), BidController.getAllBidsByServiceCategoryId);

router.delete('/hard-delete/:id', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), BidController.hardDeleteBid); // need to modify
// change status
router.patch('/status/:id', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.SERVICE_PROVIDER), validateRequest(BidValidation.changeBidStatusZodSchema), BidController.changeBidStatus); // need to modify
// cancel bid
router.delete('/cancel/:id', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.SERVICE_PROVIDER), validateRequest(BidValidation.cancelBidZodSchema), BidController.cancelBid); // need to modify

router.patch('/:id', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), validateRequest(BidValidation.updateBidZodSchema), BidController.updateBid); // need to modify

router.delete('/:id', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), BidController.deleteBid); // need to modify

router.get('/:id', BidController.getBidById); // need to modify

export const BidRoutes = router;
