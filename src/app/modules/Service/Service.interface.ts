import { Types } from 'mongoose';
export interface IService {
     name: string;
     serviceCategory: Types.ObjectId;
     image: string;
     serviceCharge: number;
     description?: string;
     faqs: Types.ObjectId[];
     whatsIncluded: string;
     whyChooseUs: string;
     createdAt: Date;
     updatedAt: Date;
     isDeleted: boolean;
     deletedAt?: Date;
     calculateOfferPrice(): Promise<number | null>;
}

export type IServiceFilters = {
     searchTerm?: string;
};
