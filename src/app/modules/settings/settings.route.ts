import express from 'express';
import auth from '../../middleware/auth';
import { FaqController } from '../Faq/Faq.controller';
import { USER_ROLES } from '../user/user.enums';
import { settingsController } from './settings.controller';

const SettingsRoutes = express.Router();

SettingsRoutes.put('/', auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN), settingsController.addSetting)
     .get('/', settingsController.getSettings)
     .get('/privacy-policy', settingsController.getPrivacyPolicy)
     .get('/app/privacy-policy', settingsController.getPrivacyPolicyForApp)
     .get('/about-us', settingsController.getAboutUs)
     .get('/app/about-us', settingsController.getAboutUsForApp)
     .get('/support', settingsController.getSupport)
     .get('/app/support', settingsController.getSupportForApp)
     .get('/terms-and-conditions', settingsController.getTermsAndConditions)
     .get('/app/terms-and-conditions', settingsController.getTermsAndConditionsForApp)
     .get('/app-version', settingsController.getAppVersion)
     .get('/contact-info', settingsController.getContactInfo)
     .get('/app/contact-info', settingsController.getContactInfoForApp)
     .get('/faqs/:type', FaqController.getAllFaqsByType);

export default SettingsRoutes;
