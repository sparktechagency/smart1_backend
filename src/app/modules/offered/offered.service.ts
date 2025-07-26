import { StatusCodes } from "http-status-codes";
import AppError from "../../../errors/AppError";
import QueryBuilder from "../../builder/QueryBuilder";
import { IJwtPayload } from "../auth/auth.interface";
import { Service } from "../Service/Service.model";
import { ICreateOfferedInput } from "./offered.interface";
import { Offered } from "./offered.model";
import { Types } from "mongoose";
import { ObjectId } from "mongodb";

const createOffered = async (offerServiceData: ICreateOfferedInput, user: IJwtPayload) => {
  const isExistsServices = await Service.find({
    _id: { $in: offerServiceData.services },
  });

  if (isExistsServices.length !== offerServiceData.services.length) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      `Some services not found ${offerServiceData.services.join(", ")} in db`
    );
  }

  const { services, discountPercentage } = offerServiceData;
  const createdBy = user.id;

  const operations = services.map((service) => ({
    updateOne: {
      filter: {
        service,
        isDeleted: { $ne: true } // to ensure recreating of offer for the service which is soft deleted
      },
      update: {
        $setOnInsert: {
          service,
          discountPercentage,
          createdBy,
        },
      },
      upsert: true,
    },
  }));

  const result = await Offered.bulkWrite(operations);
  return result;
};





const getActiveOfferedService = async (query: Record<string, unknown>) => {
  const { minPrice, maxPrice, ...pQuery } = query;

  const offeredQuery = new QueryBuilder(
    Offered.find()
      .populate('service', 'name serviceCharge'),
    query
  )
    .paginate();

  const offered = await offeredQuery.modelQuery.lean();

  const offeredMap = offered.reduce((acc, offered) => {
    //@ts-ignore
    acc[offered.service._id.toString()] = offered.discountPercentage;
    return acc;
  }, {});

  const servicesWithOfferPrice = offered.map((offered: any) => {

    const service = offered.service;
    //@ts-ignore
    const discountPercentage = offeredMap[service._id.toString()];

    if (discountPercentage) {
      const discount = (discountPercentage / 100) * service.serviceCharge;
      service.offerPrice = service.serviceCharge - discount;
    } else {
      service.offerPrice = null;
    }

    return service;
  });

  const meta = await offeredQuery.countTotal();

  return {
    meta,
    result: servicesWithOfferPrice,
  };
};

const getAllOffered = async (query: Record<string, unknown>) => {
  const offeredQuery = new QueryBuilder(
    Offered.find().populate('service', 'name serviceCharge'),
    query
  )
    .paginate()
    .filter()
    .sort();

  const offered = await offeredQuery.modelQuery.lean();

  const meta = await offeredQuery.countTotal();

  return {
    meta,
    result: offered,
  };
};


const deleteOffered = async (offers: string[], user: IJwtPayload) => {
  const objectIds = offers.map((offer) => new Types.ObjectId(offer));
  // check all objectIds are exists in db
  const isExists = await Offered.find({ _id: { $in: objectIds } });
  if (isExists.length !== offers.length) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      `Some offers not found ${offers.join(", ")} in db`
    );
  }
  const result = await Offered.updateMany({ _id: { $in: objectIds } }, { $set: { deletedBy: user.id, isDeleted: true, deletedAt: new Date() } });
  return result;
};


const deleteOfferedHard = async (offers: string[]) => {
  const objectIds = offers.map((offer) => new Types.ObjectId(offer));
  // check all objectIds are exists in db
  const isExists = await Offered.find({ _id: { $in: objectIds } });
  if (isExists.length !== offers.length) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      `Some offers not found ${offers.join(", ")} in db`
    );
  }
  const result = await Offered.deleteMany({ _id: { $in: objectIds } });
  return result;
};



export const OfferedService = {
  createOffered,
  getAllOffered,
  getActiveOfferedService,
  deleteOffered,
  deleteOfferedHard,
}