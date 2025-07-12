import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import AppError from '../../errors/AppError';
import { StatusCodes } from 'http-status-codes';
import { BunnyStorageHandeler } from '../../helpers/BunnyStorageHandeler';

const allowedMimeTypes: Record<string, string[]> = {
     image: ['image/png', 'image/jpg', 'image/jpeg', 'image/svg+xml', 'image/webp', 'image/gif'],
     audio: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/flac', 'audio/aac'],
     video: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/avi', 'video/mkv'],
     document: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'text/plain',
          'application/rtf',
          'application/zip',
          'application/x-7z-compressed',
          'application/x-rar-compressed',
     ],
     others: ['application/octet-stream', 'application/zip', 'application/x-7z-compressed', 'application/x-rar-compressed'],
     // Add the thumbnail field with valid MIME types for images
     thumbnail: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
};

// General multer storage configuration (using memory storage for simplicity)
const storage = multer.memoryStorage();
const upload = multer({
     storage: storage,
     limits: { fileSize: 2024 * 1024 * 1024 }, // 2GB max file size
     fileFilter: (req: Request, file: any, cb: Function) => {
          const fieldName = file.fieldname;
          let allowedTypes = [];

          // Check if the fieldname exists in the allowedMimeTypes object
          if (allowedMimeTypes[fieldName]) {
               allowedTypes = allowedMimeTypes[fieldName];
          } else {
               // Log the fieldName that caused the error and allow debugging
               return cb(new AppError(StatusCodes.BAD_REQUEST, 'Invalid file type'));
          }
          // Check if the mime type of the file is allowed
          if (allowedTypes.includes(file.mimetype)) {
               cb(null, true);
          } else {
               return cb(new AppError(StatusCodes.BAD_REQUEST, `Invalid file type. Only ${allowedTypes.join(', ')} files are allowed.`));
          }
     },
}).fields([
     { name: 'video', maxCount: 1 },
     { name: 'thumbnail', maxCount: 1 },
     { name: 'image', maxCount: 5 },
     { name: 'audio', maxCount: 1 },
     { name: 'document', maxCount: 1 },
     { name: 'others', maxCount: 1 },
]);

const fileUploadHandlerbunny = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
     upload(req, res, async (error: any) => {
          if (error) {
               return next(error);
          }

          if (req.files) {
               const fileUrls: Record<string, string> = {};
               const files = req.files as { [key: string]: Express.Multer.File[] };

               // Handle video upload if present
               if (files['video']) {
                    const videoFile = files['video'][0];
                    fileUrls.videoUrl = await BunnyStorageHandeler.uploadVideoToBunny(videoFile, 'videos');
               }

               // Handle image upload if present
               if (files['image']) {
                    const imageFile = files['image'][0];
                    fileUrls.imageUrl = await BunnyStorageHandeler.uploadToBunny(imageFile, 'images');
               }

               // Handle thumbnail upload if present
               if (files['thumbnail']) {
                    const thumbnailFile = files['thumbnail'][0];
                    fileUrls.thumbnailUrl = await BunnyStorageHandeler.uploadToBunny(thumbnailFile, 'thumbnails');
               }

               // Handle document upload if present
               if (files['document']) {
                    const documentFile = files['document'][0];
                    fileUrls.documentUrl = await BunnyStorageHandeler.uploadToBunny(documentFile, 'documents');
               }
               // Handle audio upload if present
               if (files['audio']) {
                    const audioFile = files['audio'][0];
                    fileUrls.audioUrl = await BunnyStorageHandeler.uploadToBunny(audioFile, 'audio');
               }
               if (req.body.data) {
                    try {
                         const data = JSON.parse(req.body.data);
                         req.body = { ...data, ...fileUrls };
                    } catch (error) {
                         return next(new AppError(StatusCodes.BAD_REQUEST, 'Invalid JSON format in req.body.data'));
                    }
               } else {
                    req.body = { ...fileUrls };
               }
          }

          next();
     });
};

export default fileUploadHandlerbunny;
