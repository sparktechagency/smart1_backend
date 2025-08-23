import { StatusCodes } from 'http-status-codes';
import moment from 'moment';
import AppError from '../../../errors/AppError';
import QueryBuilder from '../../builder/QueryBuilder';
import { AppDownload } from '../AppDownload/AppDownload.model';
import { BOOKING_STATUS, PAYMENT_STATUS } from '../booking/booking.enums';
import { Booking } from '../booking/booking.model';
import { USER_ROLES } from '../user/user.enums';
import { User } from '../user/user.model';
import { IDashboardSummary, IDownloadStats, IMonthlyUserStats, IRevenueAnalytics } from './dashboard.interface';
import { utilityFuncTogetDateWiseAndStatusWiseBookingSummary } from './dashboard.utils';

class DashboardService {
     // Get dashboard summary with KPI cards
     async getDashboardSummary(): Promise<IDashboardSummary> {
          const lastSevendDaysFromNow = moment().subtract(6, 'days').toDate();
          console.log({ lastSevendDaysFromNow });

          // Get current counts
          const [totalUsers, totalServiceProviders, totalRevenue, usersLastWeek, serviceProvidersLastWeek, revenueLastWeek] = await Promise.all([
               // Current totals
               User.countDocuments({ role: USER_ROLES.USER }),
               User.countDocuments({ role: USER_ROLES.SERVICE_PROVIDER }),
               this.getTotalRevenue(),
               // Last week totals
               User.countDocuments({
                    role: USER_ROLES.USER,
                    createdAt: { $gte: lastSevendDaysFromNow },
               }),
               User.countDocuments({
                    role: USER_ROLES.SERVICE_PROVIDER,
                    createdAt: { $gte: lastSevendDaysFromNow },
               }),
               this.getTotalRevenue(lastSevendDaysFromNow),
          ]);
          const usersGrowthPercentageChangeInLast7Days = (usersLastWeek / totalUsers) * 100;
          const serviceProvidersGrowthPercentageChangeInLast7Days = (serviceProvidersLastWeek / totalServiceProviders) * 100;
          const revenueGrowthPercentageChangeInLast7Days = (revenueLastWeek / totalRevenue) * 100;

          return {
               totalUsers: {
                    count: totalUsers,
                    percentageChange: usersGrowthPercentageChangeInLast7Days,
               },
               totalServiceProviders: {
                    count: totalServiceProviders,
                    percentageChange: serviceProvidersGrowthPercentageChangeInLast7Days,
               },
               totalRevenue: {
                    amount: totalRevenue,
                    percentageChange: revenueGrowthPercentageChangeInLast7Days,
               },
          };
     }

     // // Get monthly users vs service providers
     // async getMonthlyUserStats(year?: number): Promise<IMonthlyUserStats[]> {
     //     const currentYear = year || new Date().getFullYear();
     //     const startDate = moment(new Date(currentYear, 0, 1));
     //     const endDate = moment(new Date(currentYear, 11, 31));

     //     const [customerStats, providerStats] = await Promise.all([
     //         User.aggregate([
     //             {
     //                 $match: {
     //                     role: USER_ROLES.USER,
     //                     createdAt: { $gte: startDate, $lte: endDate }
     //                 }
     //             },
     //             {
     //                 $group: {
     //                     _id: { $month: '$createdAt' },
     //                     count: { $sum: 1 }
     //                 }
     //             },
     //             { $sort: { _id: 1 } }
     //         ]),
     //         User.aggregate([
     //             {
     //                 $match: {
     //                     role: USER_ROLES.SERVICE_PROVIDER,
     //                     createdAt: { $gte: startDate, $lte: endDate }
     //                 }
     //             },
     //             {
     //                 $group: {
     //                     _id: { $month: '$createdAt' },
     //                     count: { $sum: 1 }
     //                 }
     //             },
     //             { $sort: { _id: 1 } }
     //         ])
     //     ]);

     //     // Create monthly data array
     //     const monthNames = [
     //         'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
     //         'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
     //     ];

     //     const monthlyStats: IMonthlyUserStats[] = [];

     //     for (let month = 1; month <= 12; month++) {
     //         const customerData = customerStats.find(stat => stat._id === month);
     //         const providerData = providerStats.find(stat => stat._id === month);

     //         monthlyStats.push({
     //             month: monthNames[month - 1],
     //             customers: customerData ? customerData.count : 0,
     //             serviceProviders: providerData ? providerData.count : 0
     //         });
     //     }

     //     return monthlyStats;
     // }

     // Get monthly users vs service providers
     async getMonthlyUserStats(year?: number): Promise<IMonthlyUserStats[]> {
          const currentYear = year || new Date().getFullYear();
          const startDate = moment(new Date(currentYear, 0, 1)).startOf('day'); // Start of the year
          const endDate = moment(new Date(currentYear, 11, 31)).endOf('day'); // End of the year

          console.log('Start Date:', startDate.toString());
          console.log('End Date:', endDate.toString());

          // Aggregate data for customers and service providers
          const [customerStats, providerStats] = await Promise.all([
               User.aggregate([
                    {
                         $match: {
                              role: USER_ROLES.USER,
                              createdAt: { $gte: startDate.toDate(), $lte: endDate.toDate() },
                         },
                    },
                    {
                         $group: {
                              _id: { $month: '$createdAt' },
                              count: { $sum: 1 },
                         },
                    },
                    { $sort: { _id: 1 } },
               ]),
               User.aggregate([
                    {
                         $match: {
                              role: USER_ROLES.SERVICE_PROVIDER,
                              createdAt: { $gte: startDate.toDate(), $lte: endDate.toDate() },
                         },
                    },
                    {
                         $group: {
                              _id: { $month: '$createdAt' },
                              count: { $sum: 1 },
                         },
                    },
                    { $sort: { _id: 1 } },
               ]),
          ]);

          console.log('Customer Stats:', JSON.stringify(customerStats, null, 2));
          console.log('Provider Stats:', JSON.stringify(providerStats, null, 2));

          // Create monthly data array
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

          const monthlyStats: IMonthlyUserStats[] = [];

          for (let month = 1; month <= 12; month++) {
               const customerData = customerStats.find((stat) => stat._id === month);
               const providerData = providerStats.find((stat) => stat._id === month);

               monthlyStats.push({
                    month: monthNames[month - 1],
                    customers: customerData ? customerData.count : 0,
                    serviceProviders: providerData ? providerData.count : 0,
               });
          }

          return monthlyStats;
     }

     // Get app downloads by OS
     async getDownloadStats(): Promise<IDownloadStats> {
          const downloadStats = await AppDownload.aggregate([
               {
                    $group: {
                         _id: '$deviceType',
                         count: { $sum: 1 },
                    },
               },
          ]);

          const ios = downloadStats.find((stat) => stat._id === 'ios')?.count || 0;
          const android = downloadStats.find((stat) => stat._id === 'android')?.count || 0;
          const total = ios + android;

          return {
               ios,
               android,
               total,
          };
     }

     // // Get revenue analytics by month
     // async getRevenueAnalytics(year?: number): Promise<IRevenueAnalytics[]> {
     //     const currentYear = year || new Date().getFullYear();
     //     const startDate = moment(new Date(currentYear, 0, 1));
     //     const endDate = moment(new Date(currentYear, 11, 31));

     //     const revenueStats = await Payment.aggregate([
     //         {
     //             $match: {
     //                 status: PAYMENT_STATUS.PAID,
     //                 createdAt: { $gte: startDate, $lte: endDate }
     //             }
     //         },
     //         {
     //             $group: {
     //                 _id: { $month: '$createdAt' },
     //                 revenue: { $sum: '$amount' }
     //             }
     //         },
     //         { $sort: { _id: 1 } }
     //     ]);

     //     // Create monthly revenue data
     //     const monthNames = [
     //         'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
     //         'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
     //     ];

     //     const revenueAnalytics: IRevenueAnalytics[] = [];

     //     for (let month = 1; month <= 12; month++) {
     //         const revenueData = revenueStats.find(stat => stat._id === month);

     //         revenueAnalytics.push({
     //             month: monthNames[month - 1],
     //             revenue: revenueData ? revenueData.revenue : 0
     //         });
     //     }

     //     return revenueAnalytics;
     // }

     async getRevenueAnalytics(year?: number): Promise<IRevenueAnalytics[]> {
          const currentYear = year || new Date().getFullYear();
          const startDate = moment(new Date(currentYear, 0, 1)).startOf('day'); // Start of the year
          const endDate = moment(new Date(currentYear, 11, 31)).endOf('day'); // End of the year

          // Find all bookings that are completed and paid
          const bookings = await Booking.find({
               paymentStatus: PAYMENT_STATUS.PAID,
               status: BOOKING_STATUS.COMPLETED,
               createdAt: { $gte: startDate.toDate(), $lte: endDate.toDate() },
          })
               .select('finalAmount adminRevenuePercent createdAt')
               .lean();

          // Calculate total revenue for each month
          const revenueStats = bookings.reduce(
               (monthlyRevenue, booking) => {
                    const month = moment(booking.createdAt).month(); // Get the month (0-indexed)
                    const revenue = booking.finalAmount * (booking.adminRevenuePercent / 100);

                    if (!monthlyRevenue[month]) {
                         monthlyRevenue[month] = 0;
                    }

                    monthlyRevenue[month] += revenue;
                    return monthlyRevenue;
               },
               {} as Record<number, number>,
          );

          // Create monthly revenue data
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

          const revenueAnalytics: IRevenueAnalytics[] = [];

          for (let month = 0; month < 12; month++) {
               const revenue = revenueStats[month] || 0; // Default to 0 if no revenue data for that month

               revenueAnalytics.push({
                    month: monthNames[month],
                    revenue: revenue,
               });
          }

          return revenueAnalytics;
     }

     // Helper method to get total revenue
     private async getTotalRevenue(fromDate?: Date): Promise<number> {
          // get all the PAYMENT_STATUS.PAID bookings select athe final ammount and the adminRevenuePercent
          let booking;
          if (fromDate) {
               booking = await Booking.find({ paymentStatus: PAYMENT_STATUS.PAID, status: BOOKING_STATUS.COMPLETED, createdAt: { $gte: fromDate } })
                    .select('finalAmount adminRevenuePercent createdAt')
                    .lean();
          } else {
               booking = await Booking.find({ paymentStatus: PAYMENT_STATUS.PAID, status: BOOKING_STATUS.COMPLETED }).select('finalAmount adminRevenuePercent createdAt').lean();
          }
          // console.log({ booking });

          const totalRevenue = booking.reduce((total, booking) => total + booking.finalAmount * (booking.adminRevenuePercent / 100), 0);
          // console.log({ totalRevenue });

          return totalRevenue;
     }

     

     async getDateWiseAndStatusWiseBookingSummary(query: Record<string, any>) {
          console.log('🚀 ~ DashboardService ~ getDateWiseAndStatusWiseBookingSummary ~ query:', query);
          const { date, searchTerm } = query;

          if (!date) {
               throw new AppError(StatusCodes.BAD_REQUEST, 'Date is required');
          }

          // Normalize the date to ensure time part is set to midnight in UTC
          const startOfDay = moment.utc(date).startOf('day').toDate(); // 00:00:00 in UTC
          const endOfDay = moment.utc(date).endOf('day').toDate(); // 23:59:59 in UTC

          console.log('Start Date:', startOfDay);
          console.log('End Date:', endOfDay);

          // Define the common populate structure for user and service provider fields
          const populateOptions = [
               {
                    path: 'user',
                    select: 'full_name',
               },
               {
                    path: 'serviceProvider',
                    select: 'full_name',
               },
          ];

          // Build the base query
          const baseQuery: any = {
               createdAt: { $gte: startOfDay, $lte: endOfDay },
          };

          // If there's a search term, find matching users and service providers first
          if (searchTerm) {

               // Find users matching the search term
               const matchingUsers = await User.find({
                    full_name: { $regex: searchTerm, $options: 'i' },
                    role: { $in: [USER_ROLES.USER, USER_ROLES.SERVICE_PROVIDER] },
               }).select('_id');

               // Create the search condition
               const searchConditions = [
                    { user: { $in: matchingUsers.map((u) => u._id) } },
                    { serviceProvider: { $in: matchingUsers.map((sp) => sp._id) } },
                    { servicingDestination: { $regex: searchTerm, $options: 'i' } },
               ];

               // If there are any search conditions, add them to the query
               if (searchConditions.length > 0) {
                    baseQuery.$or = searchConditions;
               }
          }

          const bookingQuery = new QueryBuilder(Booking.find(baseQuery).populate(populateOptions), query).paginate();

          const result = await bookingQuery.modelQuery.exec();

          // Check if no results are found
          if (!result || result.length === 0) {
               throw new AppError(StatusCodes.NOT_FOUND, 'No bookings found');
          }

          const meta = await bookingQuery.countTotal();

          // Modify the status of bookings based on their current status
          result.forEach((booking) => {
               if (![BOOKING_STATUS.COMPLETED, BOOKING_STATUS.CANCELLED].includes(booking.status)) {
                    booking.status = 'inProgress' as unknown as BOOKING_STATUS;
               }
          });

          return {
               meta,
               result,
          };
     }

     async getDateWiseBookingCountSummary(date?: Date) {
          if (!date) {
               throw new Error('Date is required');
          }

          const dateWiseAndStatusWiseBookingSummary = await utilityFuncTogetDateWiseAndStatusWiseBookingSummary(date);
          const total = dateWiseAndStatusWiseBookingSummary.totalBooking.length;
          const completed = dateWiseAndStatusWiseBookingSummary.completed.length;
          const cancel = dateWiseAndStatusWiseBookingSummary.cancel.length;
          const inProgress = dateWiseAndStatusWiseBookingSummary.inProgress.length;
          return { total, completed, cancel, inProgress };
     }

     async getCustomers(query: Record<string, any>) {
          // Create the base query without lean() first
          const baseQuery = User.find({ role: USER_ROLES.USER }).select('full_name email phone address image');

          const customerQuery = new QueryBuilder(
               baseQuery as any, // Type assertion to bypass strict typing
               query,
          )
               .search(['full_name', 'email', 'phone'])
               .paginate();

          // Apply lean() after QueryBuilder operations and execute
          const result = (await customerQuery.modelQuery.lean().exec()) as any[];

          // Check if no results are found
          if (!result || result.length === 0) {
               throw new AppError(StatusCodes.NOT_FOUND, 'No customers found');
          }

          // For each customer, include the total paid amount for their bookings
          const customersWithTotalAmount = await Promise.all(
               result.map(async (customer) => {
                    // Fetch total paid amount for each customer by joining the Booking model
                    const totalPaidAmount = await Booking.aggregate([
                         {
                              $match: {
                                   user: customer._id, // Match bookings related to the current customer
                                   paymentStatus: 'paid', // Only include paid bookings
                              },
                         },
                         {
                              $group: {
                                   _id: null, // We don't need to group by anything
                                   totalAmount: { $sum: '$finalAmount' }, // Sum of finalAmount
                              },
                         },
                    ]);

                    // Extract the total amount if available, else default to 0
                    const totalAmount = totalPaidAmount.length > 0 ? totalPaidAmount[0].totalAmount : 0;

                    // Attach the totalAmount to the customer object (customer is now a plain JavaScript object due to .lean())
                    (customer as any).totalAmount = totalAmount;

                    return customer;
               }),
          );

          const meta = await customerQuery.countTotal();

          return {
               meta,
               result: customersWithTotalAmount,
          };
     }

     async getServiceProviders(query: Record<string, any>) {
          // Create the base query without lean() first
          const baseQuery = User.find({ role: USER_ROLES.SERVICE_PROVIDER }).select('full_name email phone address image adminRevenuePercent');

          const serviceProviderQuery = new QueryBuilder(
               baseQuery as any, // Type assertion to bypass strict typing
               query,
          )
               .search(['full_name', 'email', 'phone'])
               .paginate();

          // Apply lean() after QueryBuilder operations and execute
          const result = (await serviceProviderQuery.modelQuery.lean().exec()) as any[];

          // Check if no results are found
          if (!result || result.length === 0) {
               throw new AppError(StatusCodes.NOT_FOUND, 'No service providers found');
          }

          // For each service provider, include the total earned amount from their bookings
          const serviceProvidersWithTotalEarn = await Promise.all(
               result.map(async (serviceProvider) => {
                    // Fetch total earnings (deducting admin's revenue percentage) for each service provider by joining the Booking model
                    const totalEarnedAmount = await Booking.aggregate([
                         {
                              $match: {
                                   serviceProvider: serviceProvider._id, // Match bookings related to the current service provider
                                   paymentStatus: 'paid', // Only include paid bookings
                              },
                         },
                         {
                              $group: {
                                   _id: null, // We don't need to group by anything
                                   totalAmount: { $sum: '$finalAmount' }, // Sum of finalAmount
                              },
                         },
                    ]);

                    // Extract the total amount if available, else default to 0
                    const totalAmount = totalEarnedAmount.length > 0 ? totalEarnedAmount[0].totalAmount : 0;

                    // Calculate the total earned amount after admin's revenue deduction
                    const totalEarn = totalAmount - (serviceProvider.adminRevenuePercent / 100) * totalAmount;

                    // Attach the totalEarn to the service provider object (serviceProvider is a plain JS object due to .lean())
                    serviceProvider.totalEarn = totalEarn;

                    return serviceProvider;
               }),
          );

          // Get total count for pagination (if needed)
          const meta = await serviceProviderQuery.countTotal();

          return {
               meta,
               result: serviceProvidersWithTotalEarn,
          };
     }
}

export default new DashboardService();
