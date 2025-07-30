import moment from "moment";
import { BOOKING_STATUS } from "../booking/booking.enums";
import { Booking } from "../booking/booking.model";

export async function utilityFuncTogetDateWiseAndStatusWiseBookingSummary(date?: Date, searchParams?: { servicingDestination?: string; userName?: string }) {
    if (!date) {
        throw new Error('Date is required');
    }

    // Normalize the date to ensure the time part is set to midnight
    const startOfDay = moment(date).startOf('day').toDate();  // 00:00:00 of the given date
    const endOfDay = moment(date).endOf('day').toDate();      // 23:59:59 of the given date

    // Build search filters dynamically based on the provided search parameters
    const filters: any = {
        createdAt: { $gte: startOfDay, $lte: endOfDay }
    };

    // If servicingDestination is provided in searchParams, add it to the filter
    if (searchParams?.servicingDestination) {
        filters.servicingDestination = { $regex: searchParams.servicingDestination, $options: 'i' }; // Case-insensitive search
    }

    // If userName (full_name) is provided in searchParams, add it to the filter
    if (searchParams?.userName) {
        filters['user.full_name'] = { $regex: searchParams.userName, $options: 'i' }; // Case-insensitive search
    }

    // Fetch the bookings created within the given date range (ignoring time) and apply search filters
    const totalBooking = await Booking.find(filters)
        .select('user serviceProvider status bookingTime bookingDate servicingDestination createdAt')
        .populate('user', 'full_name email')
        .populate('serviceProvider', 'full_name email')
        .lean();

    console.log({ totalBooking });

    // Calculate booking statistics
    const completed = totalBooking.filter((booking) => booking.status === BOOKING_STATUS.COMPLETED);
    const cancel = totalBooking.filter((booking) => booking.status === BOOKING_STATUS.CANCELLED);
    const inProgress = totalBooking.filter((booking) => ![BOOKING_STATUS.COMPLETED, BOOKING_STATUS.CANCELLED].includes(booking.status));

    return { totalBooking, completed, cancel, inProgress };
}