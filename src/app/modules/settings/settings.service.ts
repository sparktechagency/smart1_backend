import { StatusCodes } from 'http-status-codes';
import path from 'path';
import AppError from '../../../errors/AppError';
import { ISettings } from './settings.interface';
import Settings from './settings.model';

const upsertSettings = async (data: Partial<ISettings>): Promise<ISettings> => {
     const existingSettings = await Settings.findOne({});
     if (existingSettings) {
          const updatedSettings = await Settings.findOneAndUpdate({}, data, {
               new: true,
          });
          return updatedSettings!;
     } else {
          const newSettings = await Settings.create(data);
          if (!newSettings) {
               throw new AppError(StatusCodes.BAD_REQUEST, 'Failed to add settings');
          }
          return newSettings;
     }
};
const getSettings = async (title: string) => {
     const settings: any = await Settings.findOne().select(title);
     if (title && settings[title]) {
          return settings[title];
     }
     return settings;
};

const getTermsAndConditions = async () => {
     const settings: any = await Settings.findOne();
     if (!settings) {
          return '';
     }
     return settings.termsAndConditions;
};
const getSupport = async () => {
     const settings: any = await Settings.findOne();

     if (!settings) {
          return '';
     }
     return settings.support;
};
const getAccountDeletePolicy = async () => {
     const settings: any = await Settings.findOne();

     if (!settings) {
          return '';
     }
     console.log("🚀 ~ getAccountDeletePolicy ~ settings.accountDeletePolicy:", settings.accountDeletePolicy)
     return settings.accountDeletePolicy;
};
const getPrivacyPolicy = async () => {
     const settings: any = await Settings.findOne();

     if (!settings) {
          return '';
     }
     return settings.privacyPolicy;
};
const getAboutUs = async () => {
     const settings: any = await Settings.findOne();

     if (!settings) {
          return '';
     }
     return settings.aboutUs;
};

// const getPrivacyPolicy = async () => {
//   return path.join(__dirname, '..', 'htmlResponse', 'privacyPolicy.html');
// };

const getAccountDelete = async () => {
     return path.join(__dirname, '..', 'htmlResponse', 'accountDelete.html');
};
const getAppVersion = async () => {
     const settings: any = await Settings.findOne();
     if (!settings) {
          return '';
     }
     return settings.appVersion;
};

// const getSupport = async () => {
//   return path.join(__dirname, '..', 'htmlResponse', 'support.html');
// };

const getContactInfo = async () => {
     const settings: any = await Settings.findOne();
     if (!settings) {
          return '';
     }
     return settings.contactInfo;
};
export const settingsService = {
     upsertSettings,
     getSettings,
     getPrivacyPolicy,
     getAccountDelete,
     getSupport,
     getAccountDeletePolicy,
     getTermsAndConditions,
     getAboutUs,
     getAppVersion,
     getContactInfo,
};
