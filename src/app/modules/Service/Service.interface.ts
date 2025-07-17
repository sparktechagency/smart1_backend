import { Types } from 'mongoose';
export interface IService {
     name: string;
     serviceCategory: Types.ObjectId;
     image: string;
     serviceCharge: number; // its base charge not final. final will be the of the bid price
     description?: string;
     faqs: Types.ObjectId[];
     whatsIncluded: string;
     whyChooseUs: string;
     createdAt: Date;
     updatedAt: Date;
     isDeleted: boolean;
     deletedAt?: Date;
     servedCount: number;
     calculateOfferPrice(serviceProviderId: Types.ObjectId): Promise<number | null>;
}

export type IServiceFilters = {
     searchTerm?: string;
};
