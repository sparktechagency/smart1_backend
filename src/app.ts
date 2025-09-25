import cors from 'cors';
import express, { Application, Request, Response } from 'express';
import session from 'express-session';
import passport from 'passport';
import path from 'path';
import { notFound } from './app/middleware/notFound';
import { scheduleCouponDeactivation } from './app/modules/coupon/coupon.service';
import webhookHandler from './app/modules/stripeAccount/webhookHandler';
import config from './config';
import globalErrorHandler from './globalErrorHandler/globalErrorHandler';
import router from './routes';
import { Morgan } from './shared/morgan';
import { welcome } from './utils/welcome';
const app: Application = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
//morgan
app.use(Morgan.successHandler);
app.use(Morgan.errorHandler);

//body parser
app.use(
     // cors({
     //      origin: [
     //           'http://172.31.11.225:3000',
     //           'https://172.31.11.225:3000',
     //           'http://157.241.91.8:3000',
     //           'https://157.241.91.8:3000',
     //           'http://click-serve.com',
     //           'https://click-serve.com',
     //           'http://www.click-serve.com',
     //           'https://www.click-serve.com',
     //      ],
     //      credentials: true,
     // }),
     cors({
          origin: '*',
          credentials: true,
     }),
);
// app.post('/api/v1/stripe/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);
app.post('/api/v1/stripe/webhook', express.raw({ type: 'application/json' }), webhookHandler);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//file retrieve
app.use(express.static('uploads'));

// enable session
app.use(
     session({
          secret: config.session_secret as string,
          resave: false,
          saveUninitialized: false,
          cookie: {
               secure: config.node_env === 'production',
               httpOnly: false,
               maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
               sameSite: config.node_env === 'production' ? 'none' : 'lax',
               // domain: ".yourcaptureawards.com",
               // path: "/",
          },
     }),
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

//router
app.use('/api/v1', router);
//live response
app.get('/', (req: Request, res: Response) => {
     res.send(welcome());
});

//global error handle
app.use(globalErrorHandler);

//handle not found route;
app.use(notFound);

// handling cronjobs
scheduleCouponDeactivation();

// setupTrialManagement();
export default app;
