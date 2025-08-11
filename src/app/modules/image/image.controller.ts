import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import AppError from '../../../errors/AppError';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { ImageType } from './image.enum';
import { IImage } from './image.interface';
import { imageService } from './image.service';

const createImage = catchAsync(async (req: Request, res: Response) => {
     const result = await imageService.createImage(req.body);

     sendResponse<IImage>(res, {
          statusCode: 200,
          success: true,
          message: 'Slider image created successfully',
          data: result,
     });
});

const getAllImages = catchAsync(async (req: Request, res: Response) => {
     // handlw req.query.imageType must enum ImageType
     if (!Object.values(ImageType).includes(req.params.imageType as ImageType)) {
          console.log(req.params.imageType);
          console.log(Object.values(ImageType));
          throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid image type.Must be enum ImageType');
     }

     const result = await imageService.getAllImages(req.query, req.params.imageType as ImageType);

     sendResponse<{ meta: { total: number; page: number; limit: number; }; result: IImage[]; }>(res, {
          statusCode: 200,
          success: true,
          message: 'Slider images retrieved successfully',
          data: result,
     });
});

const getAllUnpaginatedImages = catchAsync(async (req: Request, res: Response) => {
     // handlw req.query.imageType must enum ImageType
     if (!Object.values(ImageType).includes(req.params.imageType as ImageType)) {
          throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid image type.Must be enum ImageType');
     }
     const result = await imageService.getAllUnpaginatedImages(req.params.imageType as ImageType);

     sendResponse<IImage[]>(res, {
          statusCode: 200,
          success: true,
          message: 'Slider images retrieved successfully',
          data: result,
     });
});

const updateImage = catchAsync(async (req: Request, res: Response) => {
     const { id } = req.params;
     const result = await imageService.updateImage(id, req.body);

     sendResponse<IImage>(res, {
          statusCode: 200,
          success: true,
          message: 'Slider image updated successfully',
          data: result || undefined,
     });
});

const deleteImage = catchAsync(async (req: Request, res: Response) => {
     const { id } = req.params;
     const result = await imageService.deleteImage(id);

     sendResponse<IImage>(res, {
          statusCode: 200,
          success: true,
          message: 'Slider image deleted successfully',
          data: result || undefined,
     });
});

const hardDeleteImage = catchAsync(async (req: Request, res: Response) => {
     const { id } = req.params;
     const result = await imageService.hardDeleteImage(id);

     sendResponse<IImage>(res, {
          statusCode: 200,
          success: true,
          message: 'Slider image deleted successfully',
          data: result || undefined,
     });
});

const getImageById = catchAsync(async (req: Request, res: Response) => {
     const { id } = req.params;
     const result = await imageService.getImageById(id);

     sendResponse<IImage>(res, {
          statusCode: 200,
          success: true,
          message: 'Slider image retrieved successfully',
          data: result || undefined,
     });
});

export const imageController = {
     createImage,
     getAllImages,
     getAllUnpaginatedImages,
     updateImage,
     deleteImage,
     hardDeleteImage,
     getImageById
}
