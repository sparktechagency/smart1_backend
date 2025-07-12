import { Request, Response, NextFunction } from 'express';
import { getSingleFilePath, IFolderName } from '../../shared/getFilePath';

const parseMulitpleFieldsData = (...fieldNames: IFolderName[]) => {
     return async (req: Request, res: Response, next: NextFunction) => {
          try {
               // Use dynamic fieldNames to get the file paths
               const filePaths = fieldNames.reduce((acc, fieldName) => {
                    const filePath = getSingleFilePath(req.files, fieldName);
                    if (filePath) {
                         acc[fieldName] = filePath;
                    }
                    return acc;
               }, {} as Record<IFolderName, string>);

               // Handle additional data if present
               if (req.body.data) {
                    const data = JSON.parse(req.body.data);
                    req.body = { ...data, ...filePaths };
               } else {
                    req.body = filePaths;
               }

               next();
          } catch (error) {
               next(error);
          }
     };
};

export default parseMulitpleFieldsData;
