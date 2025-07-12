export type ISliderImage = {
     imageUrl: string;
     createdAt: Date;
     updatedAt: Date;
     isDeleted: boolean;
     deletedAt?: Date;
};

export type ISliderImageFilters = {
     searchTerm?: string;
};
