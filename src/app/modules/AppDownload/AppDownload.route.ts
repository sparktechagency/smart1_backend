import express from 'express';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { USER_ROLES } from '../user/user.enums';
import { AppDownloadController } from './AppDownload.controller';
import { AppDownloadValidation } from './AppDownload.validation';

const router = express.Router();

router.post('/', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    validateRequest(AppDownloadValidation.createAppDownloadZodSchema), AppDownloadController.createAppDownload);

router.get('/', AppDownloadController.getAllAppDownloads);

router.get('/unpaginated', AppDownloadController.getAllUnpaginatedAppDownloads);

// router.delete('/hard-delete/:id', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), AppDownloadController.hardDeleteAppDownload);

// router.patch('/:id', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
//     validateRequest(AppDownloadValidation.updateAppDownloadZodSchema), AppDownloadController.updateAppDownload);

// router.delete('/:id', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), AppDownloadController.deleteAppDownload);

router.get('/:id', AppDownloadController.getAppDownloadById);

export const AppDownloadRoutes = router;
