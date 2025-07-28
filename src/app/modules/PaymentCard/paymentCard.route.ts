import express from 'express';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { USER_ROLES } from '../user/user.enums';
import { paymentCardController } from './paymentCard.controller';
import { paymentCardValidation } from './paymentCard.validation';

const router = express.Router();


router.get('/', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), paymentCardController.getAllPaymentCards);

router.get('/unpaginated', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), paymentCardController.getAllUnpaginatedPaymentCards);

router.use(auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.SERVICE_PROVIDER, USER_ROLES.USER));

router.post('/', validateRequest(paymentCardValidation.createPaymentCardZodSchema), paymentCardController.createPaymentCard);
router.get('/my-cards', paymentCardController.getMyPaymentCards);

router.delete('/hard-delete/:id', paymentCardController.hardDeleteMyPaymentCard);

router.patch('/:cardNo', validateRequest(paymentCardValidation.updatePaymentCardZodSchema), paymentCardController.updateMyPaymentCard);

router.delete('/:id', paymentCardController.deleteMyPaymentCard);

router.get('/:cardNo', paymentCardController.getMyPaymentCardByCardNo);

export const paymentCardRoutes = router;
