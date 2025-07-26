import express from 'express';
import { ServiceController } from './Service.controller';
import auth from '../../middleware/auth';
import { USER_ROLES } from '../user/user.enums';
import fileUploadHandler from '../../middleware/fileUploadHandler';
import parseFileData from '../../middleware/parseFileData';
import { FOLDER_NAMES } from '../../../enums/files';
import validateRequest from '../../middleware/validateRequest';
import { ServiceValidation } from './Service.validation';

const router = express.Router();

router.post('/', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    fileUploadHandler(),
    parseFileData(FOLDER_NAMES.IMAGE),
    validateRequest(ServiceValidation.createServiceZodSchema), ServiceController.createService);

router.get('/', ServiceController.getAllServices);
router.get('/unpaginated', ServiceController.getAllUnpaginatedServices);
router.delete('/hard-delete/:id', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), ServiceController.hardDeleteService);

router.patch('/:id', fileUploadHandler(),
    parseFileData(FOLDER_NAMES.IMAGE), auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    validateRequest(ServiceValidation.updateServiceZodSchema), ServiceController.updateService);

router.delete('/:id', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), ServiceController.deleteService);
router.get('/:id', ServiceController.getServiceById);

export const ServiceRoutes = router;
