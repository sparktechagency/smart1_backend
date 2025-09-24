import express from 'express';
import { AppDownloadRoutes } from '../app/modules/AppDownload/AppDownload.route';
import { BidRoutes } from '../app/modules/Bid/Bid.route';
import { ContactRoutes } from '../app/modules/Contact/Contact.route';
import { FaqRoutes } from '../app/modules/Faq/Faq.route';
import { PaymentRoutes } from '../app/modules/Payment/Payment.route';
import { ReviewsRoutes } from '../app/modules/Reviews/Reviews.route';
import { ServiceRoutes } from '../app/modules/Service/Service.route';
import { ServiceCategoryRoutes } from '../app/modules/ServiceCategory/ServiceCategory.route';
import { AuthRouter } from '../app/modules/auth/auth.route';
import { BookingRoutes } from '../app/modules/booking/booking.route';
import { ChatRoutes } from '../app/modules/chat/chat.routes';
import { CouponRoutes } from '../app/modules/coupon/coupon.route';
import { DashboardRoutes } from '../app/modules/dashboard/dashboard.route';
import { imageRoutes } from '../app/modules/image/image.route';
import { MessageRoutes } from '../app/modules/message/message.routes';
import { NotificationRoutes } from '../app/modules/notification/notification.routes';
import { OfferedRoutes } from '../app/modules/offered/offered.route';
import SettingsRoutes from '../app/modules/settings/settings.route';
import stripeAccountRoutes from '../app/modules/stripeAccount/stripeAccount.route';
import { UserRouter } from '../app/modules/user/user.route';
import { ReportRoutes } from '../app/modules/Report/Report.route';
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
          path: '/image',
          route: imageRoutes,
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
     {
          path: '/settings',
          route: SettingsRoutes,
     },
     {
          path: '/contact',
          route: ContactRoutes,
     },
     {
          path: '/app-download',
          route: AppDownloadRoutes,
     },
     {
          path: '/dashboard',
          route: DashboardRoutes,
     },
     {
          path: '/reviews',
          route: ReviewsRoutes,
     },
     {
          path: '/report',
          route: ReportRoutes,
     },
];

routes.forEach((element) => {
     if (element?.path && element?.route) {
          router.use(element?.path, element?.route);
     }
});

export default router;
