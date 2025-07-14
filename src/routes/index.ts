import express from 'express';
import { AuthRouter } from '../app/modules/auth/auth.route';
import stripeAccountRoutes from '../app/modules/stripeAccount/stripeAccount.route';
import { UserRouter } from '../app/modules/user/user.route';
import { sliderImageRoutes } from '../app/modules/sliderImage/sliderImage.route';
import { ServiceCategoryRoutes } from '../app/modules/ServiceCategory/ServiceCategory.route';
import { FaqRoutes } from '../app/modules/Faq/Faq.route';
import { ServiceRoutes } from '../app/modules/Service/Service.route';
const router = express.Router();
const routes = [
     {
          path: '/auth',
          route: AuthRouter,
     },
     {
          path: '/users',
          route: UserRouter,
     },
     {
          path: '/stripe',
          route: stripeAccountRoutes,
     },
     {
          path: '/slider-image',
          route: sliderImageRoutes,
     },
     {
          path: '/service-category',
          route: ServiceCategoryRoutes,
     },
     {
          path: '/faq',
          route: FaqRoutes,
     },
     {
          path: '/service',
          route: ServiceRoutes,
     },
];

routes.forEach((element) => {
     if (element?.path && element?.route) {
          router.use(element?.path, element?.route);
     }
});

export default router;
