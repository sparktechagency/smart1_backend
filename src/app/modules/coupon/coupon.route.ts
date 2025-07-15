import { Router } from 'express';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { USER_ROLES } from '../user/user.enums';
import { CouponController } from './coupon.controller';
import { createCouponValidation } from './coupon.validation';

const router = Router();

// Define routes
router.post('/create', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    validateRequest(createCouponValidation.createCouponValidationSchema), CouponController.createCoupon);

router.get('/admin', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), CouponController.getAllCoupon);
router.get('/admin/unpaginated', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), CouponController.getAllUnpaginatedCoupon);

router.get('/service/:serviceId', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), CouponController.getAllCouponByServiceId);

router.patch(
    '/update/:couponCode',
    validateRequest(createCouponValidation.updateCouponValidationSchema),
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    CouponController.updateCoupon
);

router.post(
    '/:couponCode',
    // auth(USER_ROLES.USER),    
    auth(USER_ROLES.USER, USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    validateRequest(createCouponValidation.getCouponByCodeValidationSchema),
    CouponController.getCouponByCode
);

router.delete(
    '/:couponId',
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    CouponController.deleteCoupon
);

router.delete(
    '/hard/:couponId',
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    CouponController.deleteCouponHard
);

router.get(
    '/:couponId',
    CouponController.getCouponById
);

export const CouponRoutes = router;
