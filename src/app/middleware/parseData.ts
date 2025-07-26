import { Request, Response, NextFunction } from 'express';
import catchAsync from '../../shared/catchAsync';
const parseData = () => {
     return catchAsync(async (req, res, next) => {
          if (req?.body?.data) {
               req.body = JSON.parse(req.body.data);
          }

          next();
     });
};
export default parseData;
