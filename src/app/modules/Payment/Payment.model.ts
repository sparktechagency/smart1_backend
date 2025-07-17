import { Schema, model } from 'mongoose';
import { IPayment } from './Payment.interface';
import { PAYMENT_METHOD, PAYMENT_STATUS } from '../booking/booking.enums';

const PaymentSchema = new Schema<IPayment>({
     user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
     booking: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
     serviceCategory: { type: Schema.Types.ObjectId, ref: 'ServiceCategory', required: true },
     method: { type: String, enum: Object.values(PAYMENT_METHOD), required: true, default: PAYMENT_METHOD.UNSPECIFIED },
     status: { type: String, enum: Object.values(PAYMENT_STATUS), required: true, default: PAYMENT_STATUS.UNPAID },
     transactionId: { type: String, required: true },
     paymentIntent: { type: String },
     amount: { type: Number, required: true },
     gatewayResponse: { type: Object, default: {} },
     isDeleted: { type: Boolean, default: false },
     deletedAt: { type: Date },
     deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

PaymentSchema.pre('find', function (next) {
     this.find({ isDeleted: false });
     next();
});

PaymentSchema.pre('findOne', function (next) {
     this.findOne({ isDeleted: false });
     next();
});

PaymentSchema.pre('aggregate', function (next) {
     this.pipeline().unshift({ $match: { isDeleted: { $ne: true } } });
     next();
});

export const Payment = model<IPayment>('Payment', PaymentSchema);
