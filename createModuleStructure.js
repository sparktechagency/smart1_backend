const fs = require('fs');
const path = require('path');

// Function to create the module structure
function createModuleStructure(moduleName) {
  const modulePath = path.join(__dirname, 'src', 'app', 'modules', moduleName);

  // Check if the module already exists
  if (fs.existsSync(modulePath)) {
    console.log(`Module ${moduleName} already exists.`);
    return;
  }

  // Create the module folder
  fs.mkdirSync(modulePath, { recursive: true });
  console.log(`Created module folder: ${modulePath}`);

  // Define the files to create in the module
  const files = [
    { name: `${moduleName}.controller.ts`, content: getControllerContent(moduleName) },
    { name: `${moduleName}.service.ts`, content: getServiceContent(moduleName) },
    { name: `${moduleName}.model.ts`, content: getModelContent(moduleName) },
    { name: `${moduleName}.route.ts`, content: getRouteContent(moduleName) },
    { name: `${moduleName}.validation.ts`, content: getValidationContent(moduleName) },
    { name: `${moduleName}.interface.ts`, content: getInterfaceContent(moduleName) },
  ];

  // Create the files
  files.forEach(file => {
    const filePath = path.join(modulePath, file.name);
    fs.writeFileSync(filePath, file.content);
    console.log(`Created file: ${filePath}`);
  });

  console.log(`Module ${moduleName} structure created successfully.`);
}

// Helper function to create the controller content
function getControllerContent(moduleName) {
  return `import { Request, Response } from 'express';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { I${moduleName} } from './${moduleName}.interface';
import { ${moduleName}Service } from './${moduleName}.service';

const create${capitalize(moduleName)} = catchAsync(async (req: Request, res: Response) => {
     const result = await ${moduleName}Service.create${capitalize(moduleName)}(req.body);

     sendResponse<I${moduleName}>(res, {
          statusCode: 200,
          success: true,
          message: '${capitalize(moduleName)} created successfully',
          data: result,
     });
});

const getAll${capitalize(moduleName)}s = catchAsync(async (req: Request, res: Response) => {
     const result = await ${moduleName}Service.getAll${capitalize(moduleName)}s(req.query);

     sendResponse<{ meta: { total: number; page: number; limit: number; }; result: I${moduleName}[]; }>(res, {
          statusCode: 200,
          success: true,
          message: '${capitalize(moduleName)}s retrieved successfully',
          data: result,
     });
});

const getAllUnpaginated${capitalize(moduleName)}s = catchAsync(async (req: Request, res: Response) => {
     const result = await ${moduleName}Service.getAllUnpaginated${capitalize(moduleName)}s();

     sendResponse<I${moduleName}[]>(res, {
          statusCode: 200,
          success: true,
          message: '${capitalize(moduleName)}s retrieved successfully',
          data: result,
     });
});

const update${capitalize(moduleName)} = catchAsync(async (req: Request, res: Response) => {
     const { id } = req.params;
     const result = await ${moduleName}Service.update${capitalize(moduleName)}(id, req.body);

     sendResponse<I${moduleName}>(res, {
          statusCode: 200,
          success: true,
          message: '${capitalize(moduleName)} updated successfully',
          data: result || undefined,
     });
});

const delete${capitalize(moduleName)} = catchAsync(async (req: Request, res: Response) => {
     const { id } = req.params;
     const result = await ${moduleName}Service.delete${capitalize(moduleName)}(id);

     sendResponse<I${moduleName}>(res, {
          statusCode: 200,
          success: true,
          message: '${capitalize(moduleName)} deleted successfully',
          data: result || undefined,
     });
});

const hardDelete${capitalize(moduleName)} = catchAsync(async (req: Request, res: Response) => {
     const { id } = req.params;
     const result = await ${moduleName}Service.hardDelete${capitalize(moduleName)}(id);

     sendResponse<I${moduleName}>(res, {
          statusCode: 200,
          success: true,
          message: '${capitalize(moduleName)} deleted successfully',
          data: result || undefined,
     });
});

const get${capitalize(moduleName)}ById = catchAsync(async (req: Request, res: Response) => {
     const { id } = req.params;
     const result = await ${moduleName}Service.get${capitalize(moduleName)}ById(id);

     sendResponse<I${moduleName}>(res, {
          statusCode: 200,
          success: true,
          message: '${capitalize(moduleName)} retrieved successfully',
          data: result || undefined,
     });
});  

export const ${moduleName}Controller = {
     create${capitalize(moduleName)},
     getAll${capitalize(moduleName)}s,
     getAllUnpaginated${capitalize(moduleName)}s,
     update${capitalize(moduleName)},
     delete${capitalize(moduleName)},
     hardDelete${capitalize(moduleName)},
     get${capitalize(moduleName)}ById
};
`;
}

// Helper function to create the service content
function getServiceContent(moduleName) {
  return `import { StatusCodes } from 'http-status-codes';
import AppError from '../../../errors/AppError';
import { I${moduleName} } from './${moduleName}.interface';
import { ${capitalize(moduleName)} } from './${moduleName}.model';
import QueryBuilder from '../../builder/QueryBuilder';
import unlinkFile from '../../../shared/unlinkFile';

const create${capitalize(moduleName)} = async (payload: I${moduleName}): Promise<I${moduleName}> => {
     const result = await ${capitalize(moduleName)}.create(payload);
     return result;
};

const getAll${capitalize(moduleName)}s = async (query: Record<string, any>): Promise<{ meta: { total: number; page: number; limit: number; }; result: I${moduleName}[]; }> => {
     const queryBuilder = new QueryBuilder(${capitalize(moduleName)}.find(), query);
     const result = await queryBuilder.filter().sort().paginate().fields().modelQuery;
     const meta = await queryBuilder.countTotal();
     return { meta, result };
};

const getAllUnpaginated${capitalize(moduleName)}s = async (): Promise<I${moduleName}[]> => {
     const result = await ${capitalize(moduleName)}.find();
     return result;
};

const update${capitalize(moduleName)} = async (id: string, payload: Partial<I${moduleName}>): Promise<I${moduleName} | null> => {
     const isExist = await ${capitalize(moduleName)}.findById(id);
     if (!isExist) {
          unlinkFile(payload.image!);
          throw new AppError(StatusCodes.NOT_FOUND, '${capitalize(moduleName)} not found.');
     }

     unlinkFile(isExist.image!); // Unlink the old image
     return await ${capitalize(moduleName)}.findByIdAndUpdate(id, payload, { new: true });
};

const delete${capitalize(moduleName)} = async (id: string): Promise<I${moduleName} | null> => {
     const result = await ${capitalize(moduleName)}.findById(id);
     if (!result) {
          throw new AppError(StatusCodes.NOT_FOUND, '${capitalize(moduleName)} not found.');
     }
     result.isDeleted = true;
     result.deletedAt = new Date();
     await result.save();
     return result;
};

const hardDelete${capitalize(moduleName)} = async (id: string): Promise<I${moduleName} | null> => {
     const result = await ${capitalize(moduleName)}.findByIdAndDelete(id);
     if (!result) {
          throw new AppError(StatusCodes.NOT_FOUND, '${capitalize(moduleName)} not found.');
     }
     unlinkFile(result.image!);
     return result;
};

const get${capitalize(moduleName)}ById = async (id: string): Promise<I${moduleName} | null> => {
     const result = await ${capitalize(moduleName)}.findById(id);
     if (!result) {
          throw new AppError(StatusCodes.NOT_FOUND, '${capitalize(moduleName)} not found.');
     }
     return result;
};   

export const ${moduleName}Service = {
     create${capitalize(moduleName)},
     getAll${capitalize(moduleName)}s,
     getAllUnpaginated${capitalize(moduleName)}s,
     update${capitalize(moduleName)},
     delete${capitalize(moduleName)},
     hardDelete${capitalize(moduleName)},
     get${capitalize(moduleName)}ById
};
`;
}

// Helper function to create the model content
function getModelContent(moduleName) {
  return `import { Schema, model } from 'mongoose';
import { I${moduleName} } from './${moduleName}.interface';

const ${capitalize(moduleName)}Schema = new Schema<I${moduleName}>({
     image: { type: String, required: true },
     altText: { type: String, required: true },
     isDeleted: { type: Boolean, default: false },
     deletedAt: { type: Date },
}, { timestamps: true });

${capitalize(moduleName)}Schema.pre('find', function (next) {
     this.find({ isDeleted: false });
     next();
});

${capitalize(moduleName)}Schema.pre('findOne', function (next) {
     this.findOne({ isDeleted: false });
     next();
});

${capitalize(moduleName)}Schema.pre('aggregate', function (next) {
     this.pipeline().unshift({ $match: { isDeleted: { $ne: true } } });
     next();
});       

export const ${capitalize(moduleName)} = model<I${moduleName}>('${capitalize(moduleName)}', ${capitalize(moduleName)}Schema);
`;
}

// Helper function to create the route content
function getRouteContent(moduleName) {
  return `import express from 'express';
import { ${moduleName}Controller } from './${moduleName}.controller';
import auth from '../../middleware/auth';
import { USER_ROLES } from '../user/user.enums';
import fileUploadHandler from '../../middleware/fileUploadHandler';
import parseFileData from '../../middleware/parseFileData';
import { FOLDER_NAMES } from '../../../enums/files';
import validateRequest from '../../middleware/validateRequest';
import { ${moduleName}Validation } from './${moduleName}.validation';

const router = express.Router();

router.post('/', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    fileUploadHandler(),
    parseFileData(FOLDER_NAMES.IMAGE),
    validateRequest(${moduleName}Validation.create${capitalize(moduleName)}ZodSchema), ${moduleName}Controller.create${capitalize(moduleName)});

router.get('/', ${moduleName}Controller.getAll${capitalize(moduleName)}s);

router.get('/unpaginated', ${moduleName}Controller.getAllUnpaginated${capitalize(moduleName)}s);

router.delete('/hard-delete/:id', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), ${moduleName}Controller.hardDelete${capitalize(moduleName)});

router.patch('/:id', fileUploadHandler(),
    parseFileData(FOLDER_NAMES.IMAGE), auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    validateRequest(${moduleName}Validation.update${capitalize(moduleName)}ZodSchema), ${moduleName}Controller.update${capitalize(moduleName)});

router.delete('/:id', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), ${moduleName}Controller.delete${capitalize(moduleName)});

router.get('/:id', ${moduleName}Controller.get${capitalize(moduleName)}ById);

export const ${moduleName}Routes = router;
`;
}

// Helper function to create validation content
function getValidationContent(moduleName) {
  return `import { z } from 'zod';

const create${capitalize(moduleName)}ZodSchema = z.object({
     body: z.object({
          image: z.string({ required_error: 'Image is required' }),
          altText: z.string({ required_error: 'Alt text is required' }),
     }),
});

const update${capitalize(moduleName)}ZodSchema = z.object({
     body: z.object({
          image: z.string().optional(),
          altText: z.string().optional(),
     }),
});

export const ${moduleName}Validation = {
     create${capitalize(moduleName)}ZodSchema,
     update${capitalize(moduleName)}ZodSchema
};
`;
}

// Helper function to create interface content
function getInterfaceContent(moduleName) {
  return `export interface I${moduleName} {
     image: string;
     altText: string;
     createdAt: Date;
     updatedAt: Date;
     isDeleted: boolean;
     deletedAt?: Date;
}

export type I${moduleName}Filters = {
     searchTerm?: string;
};
`;
}

// Helper function to capitalize the first letter of the module name
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Example usage: Create a new module called 'sliderImage'
createModuleStructure('Contact');
