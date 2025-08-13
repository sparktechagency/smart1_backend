import { Document, Types } from 'mongoose';

// Define the interface for your settings
export interface ISettings extends Document {
     privacyPolicy: string;
     aboutUs: string;
     support: string;
     termsAndConditions: string;
     appVersion: string;
     faqs: Types.ObjectId[];
     reports: Types.ObjectId[];
     reviews: Types.ObjectId[];
     avgRating: number;
     reviewsCount: number;
}
