import { StatusCodes } from 'http-status-codes';
import { getBunnyUrl } from '../utils/getUrlBunny';
import AppError from '../errors/AppError';
import BunnyStorage from 'bunnycdn-storage';
import config from '../config';
const bunnyStorage = new BunnyStorage(config.bunnyCDN.apiKey as string, config.bunnyCDN.storageZone as string, config.bunnyCDN.region || undefined);
const extractFileKeyFromUrl = (url: string): string => {
     try {
          const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
          return urlObj.pathname.startsWith('/') ? urlObj.pathname.substring(1) : urlObj.pathname;
     } catch (error) {
          const parts = url.split('/');
          if (parts[0].includes('.') && !parts[0].includes('.')) {
               parts.shift();
          }
          return parts.join('/');
     }
};
const uploadToBunny = async (file: Express.Multer.File, folderName: string): Promise<string> => {
     const fileKey = `${folderName}/${Date.now().toString()}-${file.originalname}`;
     try {
          await bunnyStorage.upload(file.buffer, fileKey);
          return getBunnyUrl(fileKey);
     } catch (error: any) {
          throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, `Error uploading file to BunnyCDN: ${error.message}`);
     }
};
const uploadVideoToBunny = async (file: Express.Multer.File, folderName: string): Promise<string> => {
     const fileKey = `${folderName}/${Date.now().toString()}-${file.originalname}`;
     try {
          await bunnyStorage.upload(file.buffer, fileKey);
          return getBunnyUrl(fileKey);
     } catch (error: any) {
          throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, `Error uploading file to BunnyCDN: ${error.message}`);
     }
};
const deleteFromBunny = async (fileUrl: string): Promise<boolean> => {
     try {
          const filePath = extractFileKeyFromUrl(fileUrl);
          await bunnyStorage.delete(filePath);
          return true;
     } catch (error: any) {
          throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, `Error deleting file from BunnyCDN: ${error.message}`);
     }
};
const downloadVideoFromBunny = async (fileKey: string): Promise<Buffer> => {
     try {
          const buffer = await bunnyStorage.download(fileKey);

          if (!buffer || !(buffer instanceof Buffer)) {
               throw new AppError(StatusCodes.BAD_REQUEST, 'Failed to retrieve file buffer');
          }

          return buffer;
     } catch (error: any) {
          throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, `Error downloading file from BunnyCDN: ${error.message}`);
     }
};
export const BunnyStorageHandeler = {
     deleteFromBunny,
     uploadToBunny,
     uploadVideoToBunny,
     downloadVideoFromBunny,
};
