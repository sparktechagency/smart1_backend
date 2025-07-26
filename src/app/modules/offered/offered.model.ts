import { Schema, model } from "mongoose";
import { IOffered } from "./offered.interface";

const offeredSchema = new Schema<IOffered>(
  {
    service: {
      type: Schema.Types.ObjectId,
      ref: "Service",
      required: [true, "Service ID is required"],
    },
    discountPercentage: {
      type: Number,
      required: [true, "Discount percentage is required"],
      min: 0,
      max: 100,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"]
    },
    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

offeredSchema.pre('find', function (next) {
  this.find({ isDeleted: false });
  next();
});

offeredSchema.pre('findOne', function (next) {
  this.findOne({ isDeleted: false });
  next();
});

offeredSchema.pre('aggregate', function (next) {
  this.pipeline().unshift({ $match: { isDeleted: { $ne: true } } });
  next();
});

export const Offered = model<IOffered>("Offered", offeredSchema);
