import { StatusCodes } from 'http-status-codes';
import AppError from '../../../errors/AppError';
import { ISliderImage } from './sliderImage.interface';
import { SliderImage } from './sliderImage.model';

class SliderImageService {
     async createSliderImage(payload: ISliderImage): Promise<ISliderImage> {
          const result = await SliderImage.create(payload);
          return result;
     }

     async getAllSliderImages(): Promise<ISliderImage[]> {
          const result = await SliderImage.find({});
          return result;
     }

     async updateSliderImage(id: string, payload: Partial<ISliderImage>): Promise<ISliderImage | null> {
          const result = await SliderImage.findByIdAndUpdate(id, payload, { new: true });
          if (!result) {
               throw new AppError(StatusCodes.NOT_FOUND, 'Slider image not found.');
          }
          return result;
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
}

export const sliderImageService = new SliderImageService();
