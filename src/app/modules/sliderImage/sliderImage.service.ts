import { StatusCodes } from 'http-status-codes';
import AppError from '../../../errors/AppError';
import { ISliderImage } from './sliderImage.interface';
import { SliderImage } from './sliderImage.model';
import QueryBuilder from '../../builder/QueryBuilder';
import unlinkFile from '../../../shared/unlinkFile';

class SliderImageService {
     async createSliderImage(payload: ISliderImage): Promise<ISliderImage> {
          const result = await SliderImage.create(payload);
          return result;
     }

     async getAllSliderImages(query: Record<string, any>): Promise<{ meta: { total: number; page: number; limit: number; }; result: ISliderImage[]; }> {
          const queryBuilder = new QueryBuilder(SliderImage.find(), query);
          const result = await queryBuilder.filter().sort().paginate().fields().modelQuery;
          const meta = await queryBuilder.countTotal();
          return { meta, result };
     }

     async updateSliderImage(id: string, payload: Partial<ISliderImage>): Promise<ISliderImage | null> {
          const isExistSliderImage = await SliderImage.findById(id);
          if (!isExistSliderImage) {
               unlinkFile(payload.image!);
               throw new AppError(StatusCodes.NOT_FOUND, 'Slider image not found.');
          }
          // unlink old image
          unlinkFile(isExistSliderImage.image!);

          // find and update by id
          const updatedResult = await SliderImage.findByIdAndUpdate(id, payload, { new: true });
          return updatedResult;
     }

     async deleteSliderImage(id: string): Promise<ISliderImage | null> {
          const result = await SliderImage.findById(id);
          if (!result) {
               throw new AppError(StatusCodes.NOT_FOUND, 'Slider image not found.');
          }
          result.isDeleted = true;
          result.deletedAt = new Date();
          await result.save();
          return result;
     }

     async hardDeleteSliderImage(id: string): Promise<ISliderImage | null> {
          const result = await SliderImage.findByIdAndDelete(id);
          if (!result) {
               throw new AppError(StatusCodes.NOT_FOUND, 'Slider image not found.');
          }
          unlinkFile(result.image!);
          return result;
     }
}

export const sliderImageService = new SliderImageService();
