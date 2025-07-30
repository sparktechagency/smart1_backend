import express from 'express';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { USER_ROLES } from '../user/user.enums';
import { PaymentController } from './Payment.controller';
import { PaymentValidation } from './Payment.validation';

const router = express.Router();

router.post('/', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    validateRequest(PaymentValidation.createPaymentZodSchema), PaymentController.createPayment);
router.patch('/:id', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    validateRequest(PaymentValidation.updatePaymentZodSchema), PaymentController.updateCashPayment);

router.get('/', PaymentController.getAllPayments);

router.get('/unpaginated', PaymentController.getAllUnpaginatedPayments);

// router.delete('/hard-delete/:id', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), PaymentController.hardDeletePayment);

router.post('/stripe/booking/:bookingId', auth(USER_ROLES.USER), PaymentController.stripeDuePaymentByBookingId)
router.get('/success', PaymentController.successPage)
router.get('/cancel', PaymentController.cancelPage);


// router.delete('/:id', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), PaymentController.deletePayment);

router.get('/:id', PaymentController.getPaymentById);


export const PaymentRoutes = router;
