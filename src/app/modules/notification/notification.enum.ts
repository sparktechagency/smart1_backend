export enum NOTIFICATION_MODEL_TYPE {
     USER = 'User',
     PAYMENT = 'Payment',
     MESSAGE = 'Message',
     BOOKING = 'Booking',
     NOTIFICATION = 'Notification',
}

export enum NotificationScreen {
     DASHBOARD = 'DASHBOARD',
     PAYMENT_HISTORY = 'PAYMENT HISTORY',
     PROFILE = 'PROFILE',
     BOOKING = 'BOOKING',
     APP = 'APP',
}

export enum NotificationTitle {
     NEW_BOOKING = 'New Booking placed',
     BOOKING_CANCELLED = 'Booking cancelled',
     BID_CHANGED = 'Bid changed',
     BOOKING_RE_SCHEDULED = 'Booking re-scheduled',
     LOGIN = 'Login',
     // BID_ACCEPTED = 'Bid accepted',
     BOOKING_COMPLETED = 'Booking Completed',
}
