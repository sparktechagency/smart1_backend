import { Schema, model } from 'mongoose';
import { ImageType } from './image.enum';
import { IImage } from './image.interface';

const imageSchema = new Schema<IImage>(
     {
          image: {
               type: String,
               required: false,
          },
          logo: {
               type: String,
               required: false,
          },
          altText: {
               type: String,
               required: true,
          },
          imageType: {
               type: String,
               enum: Object.values(ImageType),
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

imageSchema.pre('find', function (next) {
     this.find({ isDeleted: false });
     next();
});
// do for findMany
imageSchema.pre('findOne', function (next) {
     this.find({ isDeleted: false });
     next();
});
// do for soft delete
imageSchema.pre('aggregate', function (next) {
     this.pipeline().unshift({ $match: { isDeleted: { $ne: true } } });
     next();
});

export const Image = model<IImage>('Image', imageSchema);
