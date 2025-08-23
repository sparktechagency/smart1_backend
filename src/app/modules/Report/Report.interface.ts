import { Types } from 'mongoose';
import { ReportCategoryType, ReportType } from './Report.enum';
import { ReportStatus } from 'aws-sdk/clients/inspector';

export interface IReport {
     id: Types.ObjectId;
     createdBy: Types.ObjectId;
     description: string;
     type: ReportType;
     report_type: string;
     refferenceId: Types.ObjectId;
     categoryType: ReportCategoryType;
     status: ReportStatus;
     images: string[];
     createdAt: Date;
     updatedAt: Date;
     isDeleted: boolean;
     deletedAt?: Date;
}

export type IReportFilters = {
     searchTerm?: string;
};
