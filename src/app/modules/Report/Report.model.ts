import { Schema, model } from 'mongoose';
import { ReportType } from './Report.enum';
import { IReport } from './Report.interface';

const ReportSchema = new Schema<IReport>(
     {
          createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
          description: { type: String, required: true },
          type: { type: String, enum: Object.values(ReportType), required: true },
          report_type: { type: String, required: true },
          refferenceId: { type: Schema.Types.ObjectId, refPath: 'type', required: true },
          images: [{ type: String, required: true }],
          isDeleted: { type: Boolean, default: false },
          deletedAt: { type: Date },
     },
     { timestamps: true },
);

ReportSchema.pre('find', function (next) {
     this.find({ isDeleted: false });
     next();
});

ReportSchema.pre('findOne', function (next) {
     this.findOne({ isDeleted: false });
     next();
});

ReportSchema.pre('aggregate', function (next) {
     this.pipeline().unshift({ $match: { isDeleted: { $ne: true } } });
     next();
});

export const Report = model<IReport>('Report', ReportSchema);
