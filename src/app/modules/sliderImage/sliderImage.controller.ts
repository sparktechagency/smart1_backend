import { Request, Response } from 'express';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { ISliderImage } from './sliderImage.interface';
import { sliderImageService } from './sliderImage.service';

class SliderImageController {
     createSliderImage = catchAsync(async (req: Request, res: Response) => {
          const result = await sliderImageService.createSliderImage(req.body);

          sendResponse<ISliderImage>(res, {
               statusCode: 200,
               success: true,
               message: 'Slider image created successfully',
               data: result,
          });
     });

     getAllSliderImages = catchAsync(async (req: Request, res: Response) => {
          const result = await sliderImageService.getAllSliderImages();

          sendResponse<ISliderImage[]>(res, {
               statusCode: 200,
               success: true,
               message: 'Slider images retrieved successfully',
               data: result,
          });
     });

     updateSliderImage = catchAsync(async (req: Request, res: Response) => {
          const { id } = req.params;
          const result = await sliderImageService.updateSliderImage(id, req.body);

          sendResponse<ISliderImage>(res, {
               statusCode: 200,
               success: true,
               message: 'Slider image updated successfully',
               data: result || undefined,
          });
     });

     deleteSliderImage = catchAsync(async (req: Request, res: Response) => {
          const { id } = req.params;
          const result = await sliderImageService.deleteSliderImage(id);

          sendResponse<ISliderImage>(res, {
               statusCode: 200,
               success: true,
               message: 'Slider image deleted successfully',
               data: result || undefined,
          });
     });
}

export const sliderImageController = new SliderImageController();
