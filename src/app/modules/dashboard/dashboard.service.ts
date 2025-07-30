import moment from 'moment';
import { PAYMENT_STATUS } from '../booking/booking.enums';
import { Payment } from '../Payment/Payment.model';
import { USER_ROLES } from '../user/user.enums';
import { User } from '../user/user.model';
import {
    IDashboardSummary,
    IDownloadStats,
    IMonthlyUserStats,
    IRevenueAnalytics
} from './dashboard.interface';
import { AppDownload } from '../AppDownload/AppDownload.model';

class DashboardService {
    // Get dashboard summary with KPI cards
    async getDashboardSummary(): Promise<IDashboardSummary> {
        const now = new Date();
        const sevenDaysAgo = moment().subtract(7, 'days').toDate();

        // Get current counts
        const [
            totalUsers,
            totalServiceProviders,
            totalRevenue,
            totalDownloads,
            usersLastWeek,
            serviceProvidersLastWeek,
            revenueLastWeek,
            downloadsLastWeek
        ] = await Promise.all([
            // Current totals
            User.countDocuments({ role: USER_ROLES.USER }),
            User.countDocuments({ role: USER_ROLES.SERVICE_PROVIDER }),
            this.getTotalRevenue(),
            AppDownload.countDocuments(),

            // Last week totals
            User.countDocuments({
                role: USER_ROLES.USER,
                createdAt: { $gte: sevenDaysAgo }
            }),
            User.countDocuments({
                role: USER_ROLES.SERVICE_PROVIDER,
                createdAt: { $gte: sevenDaysAgo }
            }),
            this.getTotalRevenue(sevenDaysAgo),
            AppDownload.countDocuments({
                downloadedAt: { $gte: sevenDaysAgo }
            })
        ]);

        // Calculate percentage changes
        const usersPercentageChange = this.calculatePercentageChange(
            totalUsers - usersLastWeek,
            usersLastWeek
        );
        const serviceProvidersPercentageChange = this.calculatePercentageChange(
            totalServiceProviders - serviceProvidersLastWeek,
            serviceProvidersLastWeek
        );
        const revenuePercentageChange = this.calculatePercentageChange(
            totalRevenue - revenueLastWeek,
            revenueLastWeek
        );
        const downloadsPercentageChange = this.calculatePercentageChange(
            totalDownloads - downloadsLastWeek,
            downloadsLastWeek
        );

        return {
            totalUsers: {
                count: totalUsers,
                percentageChange: usersPercentageChange
            },
            totalServiceProviders: {
                count: totalServiceProviders,
                percentageChange: serviceProvidersPercentageChange
            },
            totalRevenue: {
                amount: totalRevenue,
                percentageChange: revenuePercentageChange
            },
            totalDownloads: {
                count: totalDownloads,
                percentageChange: downloadsPercentageChange
            }
        };
    }

    // Get monthly users vs service providers
    async getMonthlyUserStats(year?: number): Promise<IMonthlyUserStats[]> {
        const currentYear = year || new Date().getFullYear();
        const startDate = moment(new Date(currentYear, 0, 1));
        const endDate = moment(new Date(currentYear, 11, 31));

        const [customerStats, providerStats] = await Promise.all([
            User.aggregate([
                {
                    $match: {
                        role: USER_ROLES.USER,
                        createdAt: { $gte: startDate, $lte: endDate }
                    }
                },
                {
                    $group: {
                        _id: { $month: '$createdAt' },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ]),
            User.aggregate([
                {
                    $match: {
                        role: USER_ROLES.SERVICE_PROVIDER,
                        createdAt: { $gte: startDate, $lte: endDate }
                    }
                },
                {
                    $group: {
                        _id: { $month: '$createdAt' },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ])
        ]);

        // Create monthly data array
        const monthNames = [
            'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ];

        const monthlyStats: IMonthlyUserStats[] = [];

        for (let month = 1; month <= 12; month++) {
            const customerData = customerStats.find(stat => stat._id === month);
            const providerData = providerStats.find(stat => stat._id === month);

            monthlyStats.push({
                month: monthNames[month - 1],
                customers: customerData ? customerData.count : 0,
                serviceProviders: providerData ? providerData.count : 0
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
                    count: { $sum: 1 }
                }
            }
        ]);

        const ios = downloadStats.find(stat => stat._id === 'ios')?.count || 0;
        const android = downloadStats.find(stat => stat._id === 'android')?.count || 0;
        const total = ios + android;

        return {
            ios,
            android,
            total
        };
    }

    // Get revenue analytics by month
    async getRevenueAnalytics(year?: number): Promise<IRevenueAnalytics[]> {
        const currentYear = year || new Date().getFullYear();
        const startDate = moment(new Date(currentYear, 0, 1));
        const endDate = moment(new Date(currentYear, 11, 31));

        const revenueStats = await Payment.aggregate([
            {
                $match: {
                    status: PAYMENT_STATUS.PAID,
                    createdAt: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: { $month: '$createdAt' },
                    revenue: { $sum: '$amount' }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Create monthly revenue data
        const monthNames = [
            'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ];

        const revenueAnalytics: IRevenueAnalytics[] = [];

        for (let month = 1; month <= 12; month++) {
            const revenueData = revenueStats.find(stat => stat._id === month);

            revenueAnalytics.push({
                month: monthNames[month - 1],
                revenue: revenueData ? revenueData.revenue : 0
            });
        }

        return revenueAnalytics;
    }

    // Helper method to get total revenue
    private async getTotalRevenue(fromDate?: Date): Promise<number> {
        const matchCondition: any = { status: PAYMENT_STATUS.PAID };

        if (fromDate) {
            matchCondition.createdAt = { $gte: fromDate };
        }

        const result = await Payment.aggregate([
            { $match: matchCondition },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        return result.length > 0 ? result[0].total : 0;
    }

    // Helper method to calculate percentage change
    private calculatePercentageChange(current: number, previous: number): number {
        if (previous === 0) {
            return current > 0 ? 100 : 0;
        }
        return Math.round(((current - previous) / previous) * 100);
    }
}

export default new DashboardService();
