import { Request, Response } from 'express';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { IContact } from './Contact.interface';
import { ContactService } from './Contact.service';

const createContact = catchAsync(async (req: Request, res: Response) => {
     const result = await ContactService.createContact(req.body);

     sendResponse<IContact>(res, {
          statusCode: 200,
          success: true,
          message: 'Contact created successfully',
          data: result,
     });
});

const getAllContacts = catchAsync(async (req: Request, res: Response) => {
     const result = await ContactService.getAllContacts(req.query);

     sendResponse<{ meta: { total: number; page: number; limit: number; }; result: IContact[]; }>(res, {
          statusCode: 200,
          success: true,
          message: 'Contacts retrieved successfully',
          data: result,
     });
});

const getAllUnpaginatedContacts = catchAsync(async (req: Request, res: Response) => {
     const result = await ContactService.getAllUnpaginatedContacts();

     sendResponse<IContact[]>(res, {
          statusCode: 200,
          success: true,
          message: 'Contacts retrieved successfully',
          data: result,
     });
});

const updateContact = catchAsync(async (req: Request, res: Response) => {
     const { id } = req.params;
     const result = await ContactService.updateContact(id, req.body);

     sendResponse<IContact>(res, {
          statusCode: 200,
          success: true,
          message: 'Contact updated successfully',
          data: result || undefined,
     });
});

const deleteContact = catchAsync(async (req: Request, res: Response) => {
     const { id } = req.params;
     const result = await ContactService.deleteContact(id);

     sendResponse<IContact>(res, {
          statusCode: 200,
          success: true,
          message: 'Contact deleted successfully',
          data: result || undefined,
     });
});

const hardDeleteContact = catchAsync(async (req: Request, res: Response) => {
     const { id } = req.params;
     const result = await ContactService.hardDeleteContact(id);

     sendResponse<IContact>(res, {
          statusCode: 200,
          success: true,
          message: 'Contact deleted successfully',
          data: result || undefined,
     });
});

const getContactById = catchAsync(async (req: Request, res: Response) => {
     const { id } = req.params;
     const result = await ContactService.getContactById(id);

     sendResponse<IContact>(res, {
          statusCode: 200,
          success: true,
          message: 'Contact retrieved successfully',
          data: result || undefined,
     });
});  

export const ContactController = {
     createContact,
     getAllContacts,
     getAllUnpaginatedContacts,
     updateContact,
     deleteContact,
     hardDeleteContact,
     getContactById
};
