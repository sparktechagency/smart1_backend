import { Router } from 'express';
import { earningsController } from './earnings.controller';
import { USER_ROLES } from '../user/user.enums';
import auth from '../../middleware/auth';

const router = Router();

// Protected routes - require authentication
router.use(auth());

// Service provider can view their own earnings
router.get('/me', earningsController.getMyEarnings);

// Admin routes
router.use(auth(USER_ROLES.ADMIN,USER_ROLES.SUPER_ADMIN));

// Admin can view all service providers' earnings
router.get('/', earningsController.getAllEarnings);

// Admin can view earnings summary
router.get('/summary', earningsController.getEarningsSummary);

// Admin can view earnings for a specific service provider
router.get('/:serviceProviderId', earningsController.getServiceProviderEarnings);

// Admin can initialize earnings for a service provider
router.post('/initialize', earningsController.initializeEarnings);

export const earningsRoutes = router;
