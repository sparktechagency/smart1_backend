import { Schema, model } from 'mongoose';
import { ISliderImage } from './sliderImage.interface';

const sliderImageSchema = new Schema<ISliderImage>(
     {
          imageUrl: {
               type: String,
               required: true,
          },
          isDeleted: {
               type: Boolean,
               default: false,
          },
          deletedAt: {
               type: Date,
          },
     },
     {
          timestamps: true,
          toJSON: {
               virtuals: true,
          },
     },
);

sliderImageSchema.pre('find', function (next) {
     this.find({ isDeleted: false });
     next();
});
// do for findMany
sliderImageSchema.pre('findOne', function (next) {
     this.find({ isDeleted: false });
     next();
});
// do for soft delete
sliderImageSchema.pre('aggregate', function (next) {
     this.pipeline().unshift({ $match: { isDeleted: { $ne: true } } });
     next();
});

export const SliderImage = model<ISliderImage>('SliderImage', sliderImageSchema);
