import express from 'express';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { USER_ROLES } from '../user/user.enums';
import { FaqController } from './Faq.controller';
import { FaqValidation } from './Faq.validation';

const router = express.Router();

router.post('/', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), validateRequest(FaqValidation.createFaqZodSchema), FaqController.createFaq);

router.get('/', FaqController.getAllFaqsByType);
router.get('/unpaginated', FaqController.getAllUnpaginatedFaqsByType);
router.delete('/hard-delete/:id', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), FaqController.hardDeleteFaq);
router.get('/service/:serviceId', FaqController.getAllFaqsByServiceId);

router.patch('/:id', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), validateRequest(FaqValidation.updateFaqZodSchema), FaqController.updateFaq);

router.delete('/:id', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), FaqController.deleteFaq);
router.get('/:id', FaqController.getFaqById);

export const FaqRoutes = router;
