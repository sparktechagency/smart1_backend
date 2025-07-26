import { Types } from "mongoose";

export interface IOffered {
  service: Types.ObjectId;
  discountPercentage: number;
  createdBy?: Types.ObjectId
  deletedBy?: Types.ObjectId
  isDeleted?: boolean
  deletedAt?: Date
}

export interface ICreateOfferedInput {
  services: string[];
  discountPercentage: number;
}