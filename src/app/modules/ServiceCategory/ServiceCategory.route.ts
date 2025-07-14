import express from 'express';
import { ServiceCategoryController } from './ServiceCategory.controller';
import auth from '../../middleware/auth';
import { USER_ROLES } from '../user/user.enums';
import fileUploadHandler from '../../middleware/fileUploadHandler';
import parseFileData from '../../middleware/parseFileData';
import { FOLDER_NAMES } from '../../../enums/files';
import validateRequest from '../../middleware/validateRequest';
import { ServiceCategoryValidation } from './ServiceCategory.validation';

const router = express.Router();

router.post('/', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    fileUploadHandler(),
    parseFileData(FOLDER_NAMES.LOGO),
    validateRequest(ServiceCategoryValidation.createServiceCategoryZodSchema), ServiceCategoryController.createServiceCategory);

router.get('/', ServiceCategoryController.getAllServiceCategorys);
router.get('/unpaginated', ServiceCategoryController.getAllUnpaginatedServiceCategorys);

router.patch('/:id', fileUploadHandler(),
    parseFileData(FOLDER_NAMES.LOGO), auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    validateRequest(ServiceCategoryValidation.updateServiceCategoryZodSchema), ServiceCategoryController.updateServiceCategory);

router.delete('/:id', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), ServiceCategoryController.deleteServiceCategory);
router.delete('/hard-delete/:id', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), ServiceCategoryController.hardDeleteServiceCategory);

export const ServiceCategoryRoutes = router;
