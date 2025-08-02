import { Types } from 'mongoose';
import { ReportType } from './Report.enum';

export interface IReport {
     id: Types.ObjectId;
     createdBy: Types.ObjectId;
     description: string;
     type: ReportType;
     report_type: string;
     refferenceId: Types.ObjectId;
     images: string[];
     createdAt: Date;
     updatedAt: Date;
     isDeleted: boolean;
     deletedAt?: Date;
}

export type IReportFilters = {
     searchTerm?: string;
};
