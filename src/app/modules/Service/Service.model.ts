import { Schema, model } from 'mongoose';
import { Offered } from '../offered/offered.model';
import { IService } from './Service.interface';

const ServiceSchema = new Schema<IService>({
     name: { type: String, required: true },
     serviceCategory: { type: Schema.Types.ObjectId, ref: 'ServiceCategory', required: true },
     image: { type: String, required: true },
     serviceCharge: { type: Number, required: true },
     description: { type: String },
     whatsIncluded: { type: String },
     whyChooseUs: { type: String },     
     faqs: [{ type: Schema.Types.ObjectId, ref: 'Faq', default: [] }],
     isDeleted: { type: Boolean, default: false },
     deletedAt: { type: Date },
}, { timestamps: true });

ServiceSchema.pre('find', function (next) {
     this.find({ isDeleted: false });
     next();
});

ServiceSchema.pre('findOne', function (next) {
     this.findOne({ isDeleted: false });
     next();
});

ServiceSchema.pre('aggregate', function (next) {
     this.pipeline().unshift({ $match: { isDeleted: { $ne: true } } });
     next();
});


ServiceSchema.methods.calculateOfferPrice = async function () {
     const offer = await Offered.findOne({ service: this._id });
   
     if (offer) {
       const discount = (offer.discountPercentage / 100) * this.serviceCharge;
       return this.serviceCharge - discount;
     }
   
     return 0;
   };

export const Service = model<IService>('Service', ServiceSchema);
