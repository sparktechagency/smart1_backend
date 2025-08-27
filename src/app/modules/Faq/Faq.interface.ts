import { FAQType } from "./Faq.enum";
import { Types } from "mongoose";
export interface IFaq {
     id: Types.ObjectId;
     createdBy?: Types.ObjectId;
     question: string;
     answer: string;
     type: FAQType;
     refferenceId: Types.ObjectId;
     createdAt: Date;
     updatedAt: Date;
     isDeleted: boolean;
     deletedAt?: Date;
}

export type IFaqFilters = {
     searchTerm?: string;
};
