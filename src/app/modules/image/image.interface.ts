import { ImageType } from "./image.enum";

export interface IImage {
     image?: string;
     logo?: string;
     altText: string;
     imageType: ImageType;
     createdAt: Date;
     updatedAt: Date;
     isDeleted: boolean;
     deletedAt?: Date;
};

export type IImageFilters = {
     searchTerm?: string;
};
