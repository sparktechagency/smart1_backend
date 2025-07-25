import express from 'express';
import { AuthRouter } from '../app/modules/auth/auth.route';
import stripeAccountRoutes from '../app/modules/stripeAccount/stripeAccount.route';
import { UserRouter } from '../app/modules/user/user.route';
import { sliderImageRoutes } from '../app/modules/sliderImage/sliderImage.route';
import { ServiceCategoryRoutes } from '../app/modules/ServiceCategory/ServiceCategory.route';
import { FaqRoutes } from '../app/modules/Faq/Faq.route';
import { ServiceRoutes } from '../app/modules/Service/Service.route';
import { CouponRoutes } from '../app/modules/coupon/coupon.route';
import { OfferedRoutes } from '../app/modules/offered/offered.route';
import { BookingRoutes } from '../app/modules/booking/booking.route';
import { BidRoutes } from '../app/modules/Bid/Bid.route';
import { PaymentRoutes } from '../app/modules/Payment/Payment.route';
import { NotificationRoutes } from '../app/modules/notification/notification.routes';
import { ChatRoutes } from '../app/modules/chat/chat.routes';
import { MessageRoutes } from '../app/modules/message/message.routes';
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
     {
          path: '/coupon',
          route: CouponRoutes,
     },
     {
          path: '/offered',
          route: OfferedRoutes,
     },
     {
          path: '/booking',
          route: BookingRoutes,
     },
     {
          path: '/bid',
          route: BidRoutes,
     },
     {
          path: '/payment',
          route: PaymentRoutes,
     },
     {
          path: '/notification',
          route: NotificationRoutes,
     },
     {
          path: '/chat',
          route: ChatRoutes,
     },
     {
          path: '/message',
          route: MessageRoutes,
     },
];

routes.forEach((element) => {
     if (element?.path && element?.route) {
          router.use(element?.path, element?.route);
     }
});

export default router;
