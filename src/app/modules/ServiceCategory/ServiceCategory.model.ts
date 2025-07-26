import { Schema, model } from 'mongoose';
import { IServiceCategory } from './ServiceCategory.interface';

const ServiceCategorySchema = new Schema<IServiceCategory>({
     name: { type: String, required: true },
     logo: { type: String, required: true },
     isDeleted: { type: Boolean, default: false },
     deletedAt: { type: Date },
}, { timestamps: true });

ServiceCategorySchema.pre('find', function (next) {
     this.find({ isDeleted: false });
     next();
});

ServiceCategorySchema.pre('findOne', function (next) {
     this.findOne({ isDeleted: false });
     next();
});

ServiceCategorySchema.pre('aggregate', function (next) {
     this.pipeline().unshift({ $match: { isDeleted: { $ne: true } } });
     next();
});  

export const ServiceCategory = model<IServiceCategory>('ServiceCategory', ServiceCategorySchema);
