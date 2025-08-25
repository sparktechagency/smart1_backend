import express from 'express';
import auth from '../../middleware/auth';
import { FaqController } from '../Faq/Faq.controller';
import { USER_ROLES } from '../user/user.enums';
import { settingsController } from './settings.controller';

const SettingsRoutes = express.Router();

SettingsRoutes.put('/', auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN), settingsController.addSetting)
     .get('/', settingsController.getSettings)
     .get('/privacy-policy', settingsController.getPrivacyPolicy)
     .get('/about-us', settingsController.getAboutUs)
     .get('/support', settingsController.getSupport)
     .get('/terms-and-conditions', settingsController.getTermsAndConditions)
     .get('/app-version', settingsController.getAppVersion)
     .get('/contact-info', settingsController.getContactInfo)
     .get('/faqs/:type', FaqController.getAllFaqsByType);

export default SettingsRoutes;
