import { StatusCodes } from 'http-status-codes';
import AppError from '../../../errors/AppError';
import QueryBuilder from '../../builder/QueryBuilder';
import { IJwtPayload } from '../auth/auth.interface';
import { IAppDownload } from './AppDownload.interface';
import { AppDownload } from './AppDownload.model';

const createAppDownload = async (payload: IAppDownload, user: IJwtPayload): Promise<IAppDownload> => {
     payload.userId = user.id;
     const result = await AppDownload.create(payload);
     if (!result) {
          throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to create app download.');
     }
     return result;
};

const getAllAppDownloads = async (query: Record<string, any>): Promise<{ meta: { total: number; page: number; limit: number; }; result: IAppDownload[]; }> => {
     const queryBuilder = new QueryBuilder(AppDownload.find(), query);
     const result = await queryBuilder.filter().sort().paginate().fields().modelQuery;
     const meta = await queryBuilder.countTotal();
     return { meta, result };
};

const getAllUnpaginatedAppDownloads = async (): Promise<IAppDownload[]> => {
     const result = await AppDownload.find();
     return result;
};

const updateAppDownload = async (id: string, payload: Partial<IAppDownload>): Promise<IAppDownload | null> => {
     const isExist = await AppDownload.findById(id);
     if (!isExist) {
          throw new AppError(StatusCodes.NOT_FOUND, 'AppDownload not found.');
     }

     return await AppDownload.findByIdAndUpdate(id, payload, { new: true });
};

const deleteAppDownload = async (id: string): Promise<IAppDownload | null> => {
     const result = await AppDownload.findById(id);
     if (!result) {
          throw new AppError(StatusCodes.NOT_FOUND, 'AppDownload not found.');
     }
     result.isDeleted = true;
     result.deletedAt = new Date();
     await result.save();
     return result;
};

const hardDeleteAppDownload = async (id: string): Promise<IAppDownload | null> => {
     const result = await AppDownload.findByIdAndDelete(id);
     if (!result) {
          throw new AppError(StatusCodes.NOT_FOUND, 'AppDownload not found.');
     }
     return result;
};

const getAppDownloadById = async (id: string): Promise<IAppDownload | null> => {
     const result = await AppDownload.findById(id);
     if (!result) {
          throw new AppError(StatusCodes.NOT_FOUND, 'AppDownload not found.');
     }
     return result;
};

export const AppDownloadService = {
     createAppDownload,
     getAllAppDownloads,
     getAllUnpaginatedAppDownloads,
     updateAppDownload,
     deleteAppDownload,
     hardDeleteAppDownload,
     getAppDownloadById
};
