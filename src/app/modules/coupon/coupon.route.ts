import { Router } from 'express';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { USER_ROLES } from '../user/user.enums';
import { createCouponValidation } from './coupon.validation';
import { CouponController } from './coupon.controller';

const router = Router();

// Define routes
router.post('/create', auth(USER_ROLES.SUPER_ADMIN,USER_ROLES.ADMIN),
    validateRequest(createCouponValidation.createCouponValidationSchema), CouponController.createCoupon);

router.get('/admin', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), CouponController.getAllCoupon);
router.get('/admin/unpaginated', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), CouponController.getAllUnpaginatedCoupon);

router.get('/service/:serviceId', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), CouponController.getAllCouponByServiceId);

router.patch(
    '/:couponCode/update-coupon',
    validateRequest(createCouponValidation.updateCouponValidationSchema),
    auth(USER_ROLES.SUPER_ADMIN,USER_ROLES.ADMIN),
    CouponController.updateCoupon
);

router.post(
    '/:couponCode',
    validateRequest(createCouponValidation.getCouponByCodeValidationSchema),
    CouponController.getCouponByCode
);

router.delete(
    '/:couponId',
    auth(USER_ROLES.SUPER_ADMIN,USER_ROLES.ADMIN),
    CouponController.deleteCoupon
);

router.get(
    '/:couponId',
    CouponController.getCouponById
);

export const CouponRoutes = router;
