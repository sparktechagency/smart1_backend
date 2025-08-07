import { Schema, model } from 'mongoose';
import { ISettings } from './settings.interface';
const settingsSchema = new Schema<ISettings>(
     {
          privacyPolicy: {
               type: String,
               default: '',
          },
          aboutUs: {
               type: String,
               default: '',
          },
          support: {
               type: String,
               default: '',
          },
          termsAndConditions: {
               type: String,
               default: '',
          },
          appVersion: {
               type: String,
               default: '',
          },
          faqs: [{ type: Schema.Types.ObjectId, ref: 'Faq', default: [] }],
          reports: [{ type: Schema.Types.ObjectId, ref: 'Report', default: [] }],
          reviews: [{ type: Schema.Types.ObjectId, ref: 'Reviews', default: [] }],
          avgRating: {
               type: Number,
               required: true,
               min: 0,
               default: 0,
          },
     },
     { timestamps: true },
);

// Create the model
const Settings = model<ISettings>('Settings', settingsSchema);

export default Settings;
