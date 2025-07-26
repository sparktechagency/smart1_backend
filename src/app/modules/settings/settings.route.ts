import express from 'express';
import auth from '../../middleware/auth';
import { settingsController } from './settings.controller';
import { USER_ROLES } from '../user/user.enums';

const SettingsRouter = express.Router();

SettingsRouter.put('/', auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN), settingsController.addSetting)
     .get('/', settingsController.getSettings)
     .get('/privacy-policy', settingsController.getPrivacyPolicy)
     .get('/aboutus', settingsController.getAboutUs)
     .get('/support', settingsController.getSupport)
     .get('/terms-and-conditions', settingsController.getTermsAndConditions)
     .get('/app-version', settingsController.getAppVersion);

export default SettingsRouter;
