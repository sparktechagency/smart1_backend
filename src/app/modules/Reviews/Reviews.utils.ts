import mongoose, { Types } from 'mongoose';
import { ReviewsType } from './Reviews.enum';
import { IReviews } from './Reviews.interface';

const updateAvgRatingOfRefference = async (type: ReviewsType, refferenceId: Types.ObjectId) => {
     const userWithReviews = await mongoose
          .model(type)
          .findById(refferenceId)
          .populate({
               path: 'reviews',
               match: { isDeleted: false }, // only non-deleted reviews
          });

     if (!userWithReviews || !userWithReviews.reviews.length) {
          await mongoose.model(type).findByIdAndUpdate(refferenceId, { avgRating: 0 });
          return;
     }

     const totalRating = userWithReviews.reviews.reduce((sum: any, review: Partial<IReviews>) => sum + (review as any).rating, 0);
     const avgRating = totalRating / userWithReviews.reviews.length;

     await mongoose.model(type).findByIdAndUpdate(refferenceId, { avgRating });
};

// Helper to update user avgRating from review doc
export async function updateRefferenceAvgRatingFromReview(doc: Partial<IReviews>) {
     if (!doc) return;
     await updateAvgRatingOfRefference(doc.type as ReviewsType, doc.refferenceId as Types.ObjectId);
}
