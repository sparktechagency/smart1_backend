import { z } from 'zod';

const getMonthlyUserStatsValidation = z.object({
  query: z.object({
    year: z
      .string()
      .optional()
      .refine(
        (val) => {
          if (!val) return true;
          const year = parseInt(val);
          return year >= 2020 && year <= new Date().getFullYear() + 1;
        },
        {
          message: 'Year must be between 2020 and next year',
        }
      ),
  }),
});

const getRevenueAnalyticsValidation = z.object({
  query: z.object({
    year: z
      .string()
      .optional()
      .refine(
        (val) => {
          if (!val) return true;
          const year = parseInt(val);
          return year >= 2020 && year <= new Date().getFullYear() + 1;
        },
        {
          message: 'Year must be between 2020 and next year',
        }
      ),
  }),
});

const getDateWiseBookingSummaryValidation = z.object({
  query: z.object({
    date: z.string().optional(),
  }),
  body: z.object({
    servicingDestination: z.string().optional(),
    userName: z.string().optional(),
  }),
});

export const DashboardValidation = {
  getMonthlyUserStatsValidation,
  getRevenueAnalyticsValidation,
  getDateWiseBookingSummaryValidation,
};
