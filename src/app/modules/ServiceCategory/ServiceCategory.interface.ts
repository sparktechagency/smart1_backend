export interface IServiceCategory {
     name: string;
     logo: string;
     createdAt: Date;
     updatedAt: Date;
     isDeleted: boolean;
     deletedAt?: Date;
}

export type IServiceCategoryFilters = {
     searchTerm?: string;
};
