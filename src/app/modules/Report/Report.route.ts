import express from 'express';
import { FOLDER_NAMES } from '../../../enums/files';
import auth from '../../middleware/auth';
import fileUploadHandler from '../../middleware/fileUploadHandler';
import parseMultipleFilesdata from '../../middleware/parseMultipleFilesdata';
import validateRequest from '../../middleware/validateRequest';
import { USER_ROLES } from '../user/user.enums';
import { ReportController } from './Report.controller';
import { ReportValidation } from './Report.validation';

const router = express.Router();

router.post('/', auth(USER_ROLES.USER, USER_ROLES.SERVICE_PROVIDER),
    fileUploadHandler(),
    parseMultipleFilesdata(FOLDER_NAMES.IMAGE),
    validateRequest(ReportValidation.createReportZodSchema), ReportController.createReport);

router.get('/', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), ReportController.getAllReports);

router.get('/unpaginated', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), ReportController.getAllUnpaginatedReports);

router.get('/booking/:bookingId', ReportController.getAllReportsByBookingId);

router.delete('/hard-delete/:id', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), ReportController.hardDeleteReport);

router.patch('/:id', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), fileUploadHandler(),
    parseMultipleFilesdata(FOLDER_NAMES.IMAGE),
    validateRequest(ReportValidation.updateReportZodSchema), ReportController.updateReport);

router.delete('/:id', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), ReportController.deleteReport);

router.get('/:id', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), ReportController.getReportById);

export const ReportRoutes = router;
