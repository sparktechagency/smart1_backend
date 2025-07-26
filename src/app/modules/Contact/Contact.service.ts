import { StatusCodes } from 'http-status-codes';
import AppError from '../../../errors/AppError';
import { IContact } from './Contact.interface';
import { Contact } from './Contact.model';
import QueryBuilder from '../../builder/QueryBuilder';
import unlinkFile from '../../../shared/unlinkFile';

const createContact = async (payload: IContact): Promise<IContact> => {
     const result = await Contact.create(payload);
     return result;
};

const getAllContacts = async (query: Record<string, any>): Promise<{ meta: { total: number; page: number; limit: number; }; result: IContact[]; }> => {
     const queryBuilder = new QueryBuilder(Contact.find(), query);
     const result = await queryBuilder.filter().sort().paginate().fields().modelQuery;
     const meta = await queryBuilder.countTotal();
     return { meta, result };
};

const getAllUnpaginatedContacts = async (): Promise<IContact[]> => {
     const result = await Contact.find();
     return result;
};

const updateContact = async (id: string, payload: Partial<IContact>): Promise<IContact | null> => {
     const isExist = await Contact.findById(id);
     if (!isExist) {
          unlinkFile(payload.image!);
          throw new AppError(StatusCodes.NOT_FOUND, 'Contact not found.');
     }

     unlinkFile(isExist.image!); // Unlink the old image
     return await Contact.findByIdAndUpdate(id, payload, { new: true });
};

const deleteContact = async (id: string): Promise<IContact | null> => {
     const result = await Contact.findById(id);
     if (!result) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Contact not found.');
     }
     result.isDeleted = true;
     result.deletedAt = new Date();
     await result.save();
     return result;
};

const hardDeleteContact = async (id: string): Promise<IContact | null> => {
     const result = await Contact.findByIdAndDelete(id);
     if (!result) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Contact not found.');
     }
     unlinkFile(result.image!);
     return result;
};

const getContactById = async (id: string): Promise<IContact | null> => {
     const result = await Contact.findById(id);
     if (!result) {
          throw new AppError(StatusCodes.NOT_FOUND, 'Contact not found.');
     }
     return result;
};   

export const ContactService = {
     createContact,
     getAllContacts,
     getAllUnpaginatedContacts,
     updateContact,
     deleteContact,
     hardDeleteContact,
     getContactById
};
