import { Types } from "mongoose";
export interface IServiceCategory {
     name: string;
     logo: string;
     createdAt: Date;
     updatedAt: Date;
     isDeleted: boolean;
     deletedAt?: Date;
     services?: Types.ObjectId[];
}

export type IServiceCategoryFilters = {
     searchTerm?: string;
};
