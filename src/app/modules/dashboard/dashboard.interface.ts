export interface IDashboardSummary {
  totalUsers: {
    count: number;
    percentageChange: number;
  };
  totalServiceProviders: {
    count: number;
    percentageChange: number;
  };
  totalRevenue: {
    amount: number;
    percentageChange: number;
  };
  // totalDownloads: {
  //   count: number;
  //   percentageChange: number;
  // };
}

export interface IMonthlyUserStats {
  month: string;
  customers: number;
  serviceProviders: number;
}

export interface IDownloadStats {
  ios: number;
  android: number;
  total: number;
}

export interface IRevenueAnalytics {
  month: string;
  revenue: number;
}

