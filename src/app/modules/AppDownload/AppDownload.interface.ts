
export interface IAppDownload {
     _id?: string;
     deviceType: 'ios' | 'android';
     userId?: string;
     ipAddress?: string;
     userAgent?: string;
     downloadedAt: Date;
     isDeleted: boolean;
     deletedAt?: Date;
}

export type IAppDownloadFilters = {
     searchTerm?: string;
};
