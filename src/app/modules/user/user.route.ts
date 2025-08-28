import express, { NextFunction, Request, Response } from 'express';
import { getSingleFilePath } from '../../../shared/getFilePath';
import auth from '../../middleware/auth';
import fileUploadHandler from '../../middleware/fileUploadHandler';
import validateRequest from '../../middleware/validateRequest';
import { UserController } from './user.controller';
import { USER_ROLES } from './user.enums';
import { UserValidation } from './user.validation';
const router = express.Router();

router
     .route('/profile')
     .get(auth(USER_ROLES.ADMIN, USER_ROLES.USER, USER_ROLES.SUPER_ADMIN, USER_ROLES.SERVICE_PROVIDER), UserController.getUserProfile)
     .patch(
          auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.USER, USER_ROLES.SERVICE_PROVIDER),
          fileUploadHandler(),
          (req: Request, res: Response, next: NextFunction) => {
               const image = getSingleFilePath(req.files, 'image');
               const data = JSON.parse(req.body.data);
               req.body = { image, ...data };
               next();
          },
          validateRequest(UserValidation.updateUserZodSchema),
          UserController.updateProfile,
     );
// createAdminToDB
router.route('/admin').post(auth(USER_ROLES.SUPER_ADMIN), validateRequest(UserValidation.createAdminZodSchema), UserController.createAdminToDB);
router.route('/admin/:id').patch(auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), validateRequest(UserValidation.updateUserByIdZodSchema), UserController.updateUserById);
// make two route for delete and block user by admin
router.route('/admin/toggle-block/:id').patch(auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), UserController.toggleUserStatus);
router.route('/admin/delete/:id').delete(auth(USER_ROLES.SUPER_ADMIN), UserController.deleteUser);

router.route('/').post(validateRequest(UserValidation.createUserZodSchema), UserController.createUser);
router.route('/service-provider').post(validateRequest(UserValidation.createServiceProviderZodSchema), UserController.createServiceProviderToDB);
router.delete('/delete', auth(USER_ROLES.USER, USER_ROLES.SERVICE_PROVIDER), UserController.deleteProfile);
router.get('/get-all', auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN), UserController.getAllRoleBasedUser);

export const UserRouter = router;
