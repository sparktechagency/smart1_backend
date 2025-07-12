import { Request, Response, NextFunction } from 'express';
import { getMultipleFilesPath } from '../../shared/getFilePath';

const parseMultipleFilesdata = (req: Request, res: Response, next: NextFunction) => {
     try {
          const image = getMultipleFilesPath(req.files, 'image');
          if (req.body.data) {
               const data = JSON.parse(req.body.data);
               req.body = { image, ...data };
          } else {
               req.body = { image };
          }
          next();
     } catch (error) {
          next(error);
     }
};

export default parseMultipleFilesdata;
