import express from 'express';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { PaymentController } from '../Payment/Payment.controller';
import { USER_ROLES } from '../user/user.enums';
import { DashboardController } from './dashboard.controller';
import { DashboardValidation } from './dashboard.validation';

const router = express.Router();

// Dashboard summary endpoint - KPI cards
router.get('/summary', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), DashboardController.getDashboardSummary);

// Monthly users vs service providers
router.get(
    '/monthly-users',
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    validateRequest(DashboardValidation.getMonthlyUserStatsValidation),
    DashboardController.getMonthlyUserStats
);

// App downloads by OS
// router.get('/download-stats', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), DashboardController.getDownloadStats);

// Revenue analytics
router.get(
    '/revenue-analytics',
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    validateRequest(DashboardValidation.getRevenueAnalyticsValidation),
    DashboardController.getRevenueAnalytics
);

// rotue for datewise status based booking summary total, completed, cancel and rests as in progress
router.get(
    '/booking-summary-count',
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    validateRequest(DashboardValidation.getDateWiseBookingSummaryValidation),
    DashboardController.getDateWiseBookingCountSummary
);

router.get(
    '/booking-summary',
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    validateRequest(DashboardValidation.getDateWiseBookingSummaryValidation),
    DashboardController.getDateWiseAndStatusWiseBookingSummary
);

// get all customer list
router.get(
    '/customers',
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    DashboardController.getCustomers
);

// get all service provider list
router.get(
    '/service-providers',
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    DashboardController.getServiceProviders
);


router.get('/transactions',
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), PaymentController.getAllPayments);

export const DashboardRoutes = router;
