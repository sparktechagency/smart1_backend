export interface ISliderImage {
     image: string;
     altText: string;
     createdAt: Date;
     updatedAt: Date;
     isDeleted: boolean;
     deletedAt?: Date;
};

export type ISliderImageFilters = {
     searchTerm?: string;
};
