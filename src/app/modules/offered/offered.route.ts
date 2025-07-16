import { Router } from 'express';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { USER_ROLES } from '../user/user.enums';
import { OfferedController } from './offered.controller';
import { OfferedValidation } from './offered.validation';
const router = Router();

router.get('/', OfferedController.getActiveOfferedService)
router.get('/all', auth(USER_ROLES.SERVICE_PROVIDER), OfferedController.getAllOffered)

router.post(
    '/',
    auth(USER_ROLES.SERVICE_PROVIDER),
    validateRequest(OfferedValidation.createOfferSchema),
    OfferedController.createOffered
)

router.delete(
    '/',
    auth(USER_ROLES.SERVICE_PROVIDER),
    validateRequest(OfferedValidation.deleteOfferSchema),
    OfferedController.deleteOffered
)

router.delete(
    '/hard',
    auth(USER_ROLES.SERVICE_PROVIDER),
    validateRequest(OfferedValidation.deleteOfferSchema),
    OfferedController.deleteOfferedHard
)

export const OfferedRoutes = router;
