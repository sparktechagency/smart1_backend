import { Types } from "mongoose";
import { ReviewsType } from "./Reviews.enum";
export interface IReviews {
     id: Types.ObjectId;
     createdBy: Types.ObjectId;
     rating: number;
     review: string;
     type: ReviewsType;
     refferenceId: Types.ObjectId;
     createdAt: Date;
     updatedAt: Date;
     isDeleted: boolean;
     deletedAt?: Date;
}

export type IReviewsFilters = {
     searchTerm?: string;
};
