import express from 'express';
import { ContactController } from './Contact.controller';
import auth from '../../middleware/auth';
import { USER_ROLES } from '../user/user.enums';
import validateRequest from '../../middleware/validateRequest';
import { ContactValidation } from './Contact.validation';

const router = express.Router();

router.post('/', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    validateRequest(ContactValidation.createContactZodSchema), ContactController.createContact);

router.get('/', ContactController.getAllContacts);

router.get('/unpaginated', ContactController.getAllUnpaginatedContacts);

router.delete('/hard-delete/:id', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), ContactController.hardDeleteContact);

router.patch('/:id', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    validateRequest(ContactValidation.updateContactZodSchema), ContactController.updateContact);

router.delete('/:id', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), ContactController.deleteContact);

router.get('/:id', ContactController.getContactById);

export const ContactRoutes = router;
