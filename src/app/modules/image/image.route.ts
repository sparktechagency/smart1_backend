import express from 'express';
import { FOLDER_NAMES } from '../../../enums/files';
import auth from '../../middleware/auth';
import fileUploadHandler from '../../middleware/fileUploadHandler';
// import parseFileData from '../../middleware/parseFileData';
import parseMulitpleFieldsData from '../../middleware/parseMulitpleFieldsData';
import validateRequest from '../../middleware/validateRequest';
import { USER_ROLES } from '../user/user.enums';
import { imageController } from './image.controller';
import { ImageValidation } from './image.validation';
const router = express.Router();

router.post('/', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    fileUploadHandler(),
    // parseFileData(FOLDER_NAMES.IMAGE),
    parseMulitpleFieldsData(FOLDER_NAMES.LOGO, FOLDER_NAMES.IMAGE),
    validateRequest(ImageValidation.createImageZodSchema), imageController.createImage);
router.delete('/hard-delete/:id', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), imageController.hardDeleteImage);
router.get('/unpaginated/:imageType', imageController.getAllUnpaginatedImages);
router.get('/:imageType', imageController.getAllImages);
router.patch('/:id',
    fileUploadHandler(),
    // parseFileData(FOLDER_NAMES.IMAGE),
    parseMulitpleFieldsData(FOLDER_NAMES.LOGO, FOLDER_NAMES.IMAGE), auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    validateRequest(ImageValidation.updateImageZodSchema), imageController.updateImage);
router.delete('/:id', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), imageController.deleteImage);
router.get('/:id', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), imageController.getImageById);

export const imageRoutes = router;
