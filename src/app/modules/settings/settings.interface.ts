import { Document, Types } from 'mongoose';

// Define the interface for your settings
export interface ISettings extends Document {
     privacyPolicy: string;
     aboutUs: string;
     support: string;
     accountDeletePolicy: string;
     termsAndConditions: string;
     appVersion: string;
     faqs: Types.ObjectId[];
     reports: Types.ObjectId[];
     reviews: Types.ObjectId[];
     avgRating: number;
     reviewsCount: number;
     contactInfo : {
          email:string;
          phone:string;
          address:string;
          facebook?:string;
          twitter?:string;
          instagram?:string;
          linkedin?:string;
          whatsapp?:string;
     }
}
