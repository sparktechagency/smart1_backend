import express from 'express';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { USER_ROLES } from '../user/user.enums';
import { ReviewsController } from './Reviews.controller';
import { ReviewsValidation } from './Reviews.validation';

const router = express.Router();

router.post('/', auth(USER_ROLES.USER, USER_ROLES.SERVICE_PROVIDER),
    validateRequest(ReviewsValidation.createReviewsZodSchema), ReviewsController.createReviews);

router.get('/', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), ReviewsController.getAllReviews);
router.get('/unpaginated', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), ReviewsController.getAllUnpaginatedReviews);
router.delete('/hard-delete/:id', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), ReviewsController.hardDeleteReviews);
router.get('/booking/:bookingId', ReviewsController.getAllReviewsByBookingId);

router.patch('/:id', auth(USER_ROLES.SERVICE_PROVIDER, USER_ROLES.USER),
    validateRequest(ReviewsValidation.updateReviewsZodSchema), ReviewsController.updateReviews);

router.delete('/:id', auth(USER_ROLES.SERVICE_PROVIDER, USER_ROLES.USER, USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), ReviewsController.deleteReviews);
router.get('/:id', auth(USER_ROLES.SERVICE_PROVIDER, USER_ROLES.USER), ReviewsController.getReviewsById);

export const ReviewsRoutes = router;
