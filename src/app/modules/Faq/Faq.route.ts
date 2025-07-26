import express from 'express';
import { FaqController } from './Faq.controller';
import auth from '../../middleware/auth';
import { USER_ROLES } from '../user/user.enums';
import validateRequest from '../../middleware/validateRequest';
import { FaqValidation } from './Faq.validation';

const router = express.Router();

router.post('/', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    validateRequest(FaqValidation.createFaqZodSchema), FaqController.createFaq);

router.get('/', FaqController.getAllFaqs);
router.get('/unpaginated', FaqController.getAllUnpaginatedFaqs);
router.delete('/hard-delete/:id', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), FaqController.hardDeleteFaq);
router.get('/service/:serviceId', FaqController.getAllFaqsByServiceId);

router.patch('/:id', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    validateRequest(FaqValidation.updateFaqZodSchema), FaqController.updateFaq);

router.delete('/:id', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), FaqController.deleteFaq);
router.get('/:id', FaqController.getFaqById);

export const FaqRoutes = router;
