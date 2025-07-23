import express from 'express';
import { PaymentController } from './Payment.controller';
import auth from '../../middleware/auth';
import { USER_ROLES } from '../user/user.enums';
import fileUploadHandler from '../../middleware/fileUploadHandler';
import parseFileData from '../../middleware/parseFileData';
import { FOLDER_NAMES } from '../../../enums/files';
import validateRequest from '../../middleware/validateRequest';
import { PaymentValidation } from './Payment.validation';

const router = express.Router();

router.post('/', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    fileUploadHandler(),
    parseFileData(FOLDER_NAMES.IMAGE),
    validateRequest(PaymentValidation.createPaymentZodSchema), PaymentController.createPayment);

router.get('/', PaymentController.getAllPayments);

router.get('/unpaginated', PaymentController.getAllUnpaginatedPayments);

router.delete('/hard-delete/:id', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), PaymentController.hardDeletePayment);


router.get('/success', PaymentController.successPage)
router.get('/cancel', PaymentController.cancelPage);

router.patch('/:id', fileUploadHandler(),
    parseFileData(FOLDER_NAMES.IMAGE), auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    validateRequest(PaymentValidation.updatePaymentZodSchema), PaymentController.updatePayment);

router.delete('/:id', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), PaymentController.deletePayment);

router.get('/:id', PaymentController.getPaymentById);


export const PaymentRoutes = router;
