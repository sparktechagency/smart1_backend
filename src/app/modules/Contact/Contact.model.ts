import { Schema, model } from 'mongoose';
import { IContact } from './Contact.interface';

const ContactSchema = new Schema<IContact>({
     phone: { type: String, required: true },
     email: { type: String, required: true },
     address: { type: String, required: true },
     isDeleted: { type: Boolean, default: false },
     deletedAt: { type: Date },
}, { timestamps: true });

ContactSchema.pre('find', function (next) {
     this.find({ isDeleted: false });
     next();
});

ContactSchema.pre('findOne', function (next) {
     this.findOne({ isDeleted: false });
     next();
});

ContactSchema.pre('aggregate', function (next) {
     this.pipeline().unshift({ $match: { isDeleted: { $ne: true } } });
     next();
});

export const Contact = model<IContact>('Contact', ContactSchema);
