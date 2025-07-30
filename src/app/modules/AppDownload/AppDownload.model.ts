import { Schema, model } from 'mongoose';
import { IAppDownload } from './AppDownload.interface';

const appDownloadSchema = new Schema<IAppDownload>(
     {
          deviceType: {
               type: String,
               enum: ['ios', 'android'],
               required: true,
          },
          userId: {
               type: Schema.Types.ObjectId,
               ref: 'User',
               required: false,
          },
          ipAddress: {
               type: String,
               required: false,
          },
          userAgent: {
               type: String,
               required: false,
          },
          downloadedAt: {
               type: Date,
               default: Date.now,
          },
          isDeleted: {
               type: Boolean,
               default: false,
          },
          deletedAt: {
               type: Date,
               required: false,
          },
     },
     { timestamps: true }
);

// Add pre-hooks to filter out deleted documents
appDownloadSchema.pre('find', function (next) {
     this.find({ isDeleted: false });
     next();
});

appDownloadSchema.pre('findOne', function (next) {
     this.findOne({ isDeleted: false });
     next();
});

appDownloadSchema.pre('aggregate', function (next) {
     this.pipeline().unshift({ $match: { isDeleted: { $ne: true } } });
     next();
});

export const AppDownload = model<IAppDownload>('AppDownload', appDownloadSchema);
