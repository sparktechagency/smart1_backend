import { StatusCodes } from 'http-status-codes';
import AppError from '../../../errors/AppError';
import unlinkFile from '../../../shared/unlinkFile';
import QueryBuilder from '../../builder/QueryBuilder';
import { ImageType } from './image.enum';
import { IImage } from './image.interface';
import { Image } from './image.model';

const createImage = async (payload: IImage): Promise<IImage> => {
     // ensure if imageType is logo then it can't be 2 at a time in db
     if (payload.imageType === ImageType.LOGO) {
          const isExistLogo = await Image.findOne({ imageType: ImageType.LOGO });
          console.log(payload);
          if (isExistLogo) {
               unlinkFile(payload.logo!);
               throw new AppError(StatusCodes.BAD_REQUEST, 'Logo already exists.');
          }
     }
     const result = await Image.create(payload);
     if (!result) {
          if (payload.imageType === ImageType.LOGO) {
               unlinkFile(payload.logo!);
          } else {
               unlinkFile(payload.image!);
          }
          throw new AppError(StatusCodes.BAD_REQUEST, 'Failed to create slider image.');
     }
     return result;
}

const getAllImages = async (query: Record<string, any>, imageType: ImageType): Promise<{ meta: { total: number; page: number; limit: number; }; result: IImage[]; }> => {
     const queryBuilder = new QueryBuilder(Image.find({ imageType }), query);
     const result = await queryBuilder.filter().sort().paginate().fields().modelQuery;
     if (!result || result.length === 0) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Images not found.');
     }
     const meta = await queryBuilder.countTotal();
     return { meta, result };
}

const getAllUnpaginatedImages = async (imageType: ImageType): Promise<IImage[]> => {
     const result = await Image.find({ imageType });
     if (!result || result.length === 0) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Images not found.');
     }
     return result;
}

const updateImage = async (id: string, payload: Partial<IImage>): Promise<IImage | null> => {
     const isExistSliderImage = await Image.findById(id);
     if (!isExistSliderImage) {
          if (payload.imageType === ImageType.LOGO) {
               unlinkFile(payload.logo!);
          } else {
               unlinkFile(payload.image!);
          }
          throw new AppError(StatusCodes.NOT_FOUND, 'Image not found.');
     }
     // ensure if isExistSliderImage.imageType is logo then only payload.logo can be used for update
     if (isExistSliderImage?.imageType === ImageType.LOGO) {
          if (payload.image) {
               unlinkFile(payload.image!);
               throw new AppError(StatusCodes.BAD_REQUEST, 'Logo can\'t be updated. Please update logo using logo field.');
          }
     }
     // unlink old image
     if (isExistSliderImage.imageType === ImageType.LOGO) {
          unlinkFile(isExistSliderImage.logo!);
     } else {
          unlinkFile(isExistSliderImage.image!);
     }

     // find and update by id
     const updatedResult = await Image.findByIdAndUpdate(id, payload, { new: true });
     return updatedResult;
}

const deleteImage = async (id: string): Promise<IImage | null> => {
     const result = await Image.findById(id);
     if (!result) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Image not found.');
     }
     result.isDeleted = true;
     result.deletedAt = new Date();
     await result.save();
     return result;
}

const hardDeleteImage = async (id: string): Promise<IImage | null> => {
     const result = await Image.findByIdAndDelete(id);
     if (!result) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Image not found.');
     }
     if (result.imageType === ImageType.LOGO) {
          unlinkFile(result.logo!);
     } else {
          unlinkFile(result.image!);
     }
     return result;
}

const getImageById = async (id: string): Promise<IImage | null> => {
     const result = await Image.findById(id);
     if (!result) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Image not found.');
     }
     return result;
}

export const imageService = {
     createImage,
     getAllImages,
     getAllUnpaginatedImages,
     updateImage,
     deleteImage,
     hardDeleteImage,
     getImageById
};
