import { Request, Response, NextFunction } from 'express';
import { getMultipleFilesPath, IFolderName } from '../../shared/getFilePath';

const parseMultipleFilesdata = (fieldName: IFolderName) => (req: Request, res: Response, next: NextFunction) => {
     try {
          const images = getMultipleFilesPath(req.files, fieldName);
          if (req.body.data) {
               const data = JSON.parse(req.body.data);
               req.body = { images, ...data };
          } else {
               req.body = { images };
          }
          next();
     } catch (error) {
          next(error);
     }
};

export default parseMultipleFilesdata;
