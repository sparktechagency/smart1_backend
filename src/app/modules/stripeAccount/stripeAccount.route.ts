import express from 'express';
import { stripeAccountController } from './stripeAccount.controller';
import auth from '../../middleware/auth';
import { USER_ROLES } from '../user/user.enums';

// import { auth } from "../../middlewares/auth.js";

const stripeAccountRoutes = express.Router();

stripeAccountRoutes
     .post('/create-connected-account', auth(USER_ROLES.SERVICE_PROVIDER), stripeAccountController.createStripeAccount)
     // .get('/success-account/:id', stripeAccountController.successPageAccount)
     .get('/refreshAccountConnect/:id', stripeAccountController.refreshAccountConnect);

stripeAccountRoutes.get('/success-account/:accountId', stripeAccountController.onConnectedStripeAccountSuccess);

export default stripeAccountRoutes;
