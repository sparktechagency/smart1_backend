import { Schema, model } from 'mongoose';
import { IFaq } from './Faq.interface';
import { FAQType } from './Faq.enum';

const FaqSchema = new Schema<IFaq>({
     createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: false },
     question: { type: String, required: true },
     answer: { type: String, required: true },
     type: { type: String, enum: Object.values(FAQType), required: true },
     refferenceId: { type: Schema.Types.ObjectId, refPath: 'type', required: true },
     isDeleted: { type: Boolean, default: false },
     deletedAt: { type: Date },
}, { timestamps: true });

FaqSchema.pre('find', function (next) {
     this.find({ isDeleted: false });
     next();
});

FaqSchema.pre('findOne', function (next) {
     this.findOne({ isDeleted: false });
     next();
});

FaqSchema.pre('aggregate', function (next) {
     this.pipeline().unshift({ $match: { isDeleted: { $ne: true } } });
     next();
});

export const Faq = model<IFaq>('Faq', FaqSchema);
