import express from 'express';
import { DashboardController } from './dashboard.controller';
import { DashboardValidation } from './dashboard.validation';
import validateRequest from '../../middleware/validateRequest';

const router = express.Router();

// Dashboard summary endpoint - KPI cards
router.get('/summary', DashboardController.getDashboardSummary);

// Monthly users vs service providers
router.get(
    '/monthly-users',
    validateRequest(DashboardValidation.getMonthlyUserStatsValidation),
    DashboardController.getMonthlyUserStats
);

// App downloads by OS
router.get('/download-stats', DashboardController.getDownloadStats);

// Revenue analytics
router.get(
    '/revenue-analytics',
    validateRequest(DashboardValidation.getRevenueAnalyticsValidation),
    DashboardController.getRevenueAnalytics
);

export const DashboardRoutes = router;
