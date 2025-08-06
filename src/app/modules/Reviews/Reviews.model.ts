import { Schema, model } from 'mongoose';
import { ReviewsType } from './Reviews.enum';
import { IReviews } from './Reviews.interface';
import { updateRefferenceAvgRatingFromReview } from './Reviews.utils';

const ReviewsSchema = new Schema<IReviews>(
     {
          createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
          rating: { type: Number, required: true },
          review: { type: String, required: true },
          type: { type: String, enum: Object.values(ReviewsType), required: true },
          refferenceId: { type: Schema.Types.ObjectId, refPath: 'type', required: false },
          isDeleted: { type: Boolean, default: false },
          deletedAt: { type: Date },
          deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
     },
     { timestamps: true },
);

ReviewsSchema.pre('find', function (next) {
     this.find({ isDeleted: false });
     next();
});

ReviewsSchema.pre('findOne', function (next) {
     this.findOne({ isDeleted: false });
     next();
});

ReviewsSchema.pre('aggregate', function (next) {
     this.pipeline().unshift({ $match: { isDeleted: { $ne: true } } });
     next();
});

ReviewsSchema.post('save', async function (doc, next) {
     await updateRefferenceAvgRatingFromReview(doc);
     next();
});

ReviewsSchema.post('findOneAndUpdate', async function (doc, next) {
     await updateRefferenceAvgRatingFromReview(doc);
     next();
});

ReviewsSchema.post('findOneAndDelete', async function (doc, next) {
     await updateRefferenceAvgRatingFromReview(doc);
     next();
});

export const Reviews = model<IReviews>('Reviews', ReviewsSchema);
