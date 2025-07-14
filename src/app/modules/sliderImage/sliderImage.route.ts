import express from 'express';
import { sliderImageController } from './sliderImage.controller';
import auth from '../../middleware/auth';
import { USER_ROLES } from '../user/user.enums';
import fileUploadHandler from '../../middleware/fileUploadHandler';
import parseFileData from '../../middleware/parseFileData';
import { FOLDER_NAMES } from '../../../enums/files';
import validateRequest from '../../middleware/validateRequest';
import { SliderImageValidation } from './sliderImage.validation';
const router = express.Router();

router.post('/', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    fileUploadHandler(),
    parseFileData(FOLDER_NAMES.IMAGE),
    validateRequest(SliderImageValidation.createSliderImageZodSchema), sliderImageController.createSliderImage);
router.get('/', sliderImageController.getAllSliderImages).get('/unpaginated', sliderImageController.getAllUnpaginatedSliderImages);
router.patch('/:id',
    fileUploadHandler(),
    parseFileData(FOLDER_NAMES.IMAGE), auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    validateRequest(SliderImageValidation.updateSliderImageZodSchema), sliderImageController.updateSliderImage);
router.delete('/:id', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), sliderImageController.deleteSliderImage);
router.delete('/hard-delete/:id', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), sliderImageController.hardDeleteSliderImage);

export const sliderImageRoutes = router;
