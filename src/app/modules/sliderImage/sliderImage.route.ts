import express from 'express';
import { sliderImageController } from './sliderImage.controller';
import auth from '../../middleware/auth';
import { USER_ROLES } from '../user/user.enums';

const router = express.Router();

router.post('/', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), sliderImageController.createSliderImage);
router.get('/', sliderImageController.getAllSliderImages);
router.patch('/:id', sliderImageController.updateSliderImage);
router.delete('/:id', sliderImageController.deleteSliderImage);

export const sliderImageRoutes = router;
