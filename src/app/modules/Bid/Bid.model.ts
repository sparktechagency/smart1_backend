import { Schema, model } from 'mongoose';
import { CANCELL_OR_REFUND_REASON } from '../booking/booking.enums';
import { BID_STATUS } from './Bid.enum';
import { IBid } from './Bid.interface';

const BidSchema = new Schema<IBid>(
     {
          rate: { type: Number, required: true },
          serviceProvider: { type: Schema.Types.ObjectId, ref: 'User', required: true },
          serviceCategory: { type: Schema.Types.ObjectId, ref: 'ServiceCategory', required: true },
          booking: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
          status: { type: String, enum: BID_STATUS, default: BID_STATUS.PENDING },
          bidCancelReason: { type: String, enum: Object.values(CANCELL_OR_REFUND_REASON), required: false },
          isAccepted: { type: Boolean, default: false },
          review: { type: [Schema.Types.ObjectId], ref: 'Review', default: [] },
          isDeleted: { type: Boolean, default: false },
          deletedAt: { type: Date },
     },
     { timestamps: true },
);

BidSchema.pre('find', function (next) {
     this.find({ isDeleted: false });
     next();
});

BidSchema.pre('findOne', function (next) {
     this.findOne({ isDeleted: false });
     next();
});

BidSchema.pre('aggregate', function (next) {
     this.pipeline().unshift({ $match: { isDeleted: { $ne: true } } });
     next();
});

export const Bid = model<IBid>('Bid', BidSchema);
