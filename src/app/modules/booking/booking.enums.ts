//
//  * যখন কোণ booking create হবে তখন তার default booking.status হবে pending
//  * যখন কোণ bid create হবে তখন তার default bid.status হবে pending
//  * যখন কোণ booking accept হবে তখন তার default booking.status হবে confirmed আর যেই bid.id accept হল তখন তার default bid.status হবে accepted এবং তাছাড়া ঐ booking._id এর against এ যত গুলো booking আছে সেগুলো booking.status হবে rejected
//  * user যখন কোণ booking cancel হবে তখন তার default booking.status হবে cancelled আর যেই booking.acceptedBid এর  status হবে cancelled with reason
//  * provider যখন কোণ booking cancel হবে তখন তার default booking.status হবে pending আর যেই booking.acceptedBid এর  status হবে cancelled with reason পাশাপাশি এই booking._id এর against এ যত গুলো bid আছে সেগুলো bid.status হবে pending + user& ঐসব provider রা notificatio পাবে
//

export enum TRACK_BOOKING_STATUS {
     PENDING_AT = 'pendingAt', // bid not accepted need accept first
     CONFIRMED_AT = 'confirmedAt',
     ACCEPTED_AT = 'acceptedAt', // bid accepted but not started so bidChange allowed
     ON_THE_WAY_AT = 'on_the_wayAt',
     WORK_STARTED_AT = 'work_startedAt',
     COMPLETED_AT = 'completedAt',
     CANCELLED_AT = 'cancelledAt',
}

export enum BOOKING_STATUS {
     PENDING = 'pending', // bid not accepted need accept first
     CONFIRMED = 'confirmed', // bid accepted but not started so bidChange allowed
     ON_THE_WAY = 'on the way',
     WORK_STARTED = 'work started',
     COMPLETED = 'completed',
     CANCELLED = 'cancelled',
}

export enum PAYMENT_METHOD {
     CASH = 'cash',
     ONLINE = 'online',
}

export enum PAYMENT_STATUS {
     UNPAID = 'unpaid',
     PAID = 'paid',
     REFUNDED = 'refunded',
     CANCELLED = 'cancelled',
}

export enum CANCELL_OR_REFUND_REASON {
     CANCELLED_BOOKING = 'Cancelled booking',
     BID_CHANGED_BY_USER = 'Bid changed by user',
     BID_CANCELLED_BY_PROVIDER = 'Bid cancelled by provider',
     PERSONAL_REASON = 'Personal reason',
     TECHNIAL_ISSUE = 'Technical issue',
     CUSTOMER_DID_NOT_RESPOND = "Customer didn't respond",
     HEALTH_OR_EMERGENCY = 'Health or emergency',
     SCHEDULE_CONFLICT = 'Schedule conflict',
     OTHER_REASON = 'Other reason',
     CHANGE_OF_PLANS = 'Change of plans',
     SERVICE_NO_LONGER_NEEDED = 'Service no longer needed',
     SERVICE_PROVIDER_ASKED_ME_TO_CANCEL = 'Service provider asked me to cancel',
     I_EXPERIENCED_PAYMENT_ISSUE = 'I experienced payment issue',
}

export const DEFAULT_BOOKING_RANGE: number = 1047570; // in km
export const MINIMUM_ACCEPTABLE_DUE_AMOUNT: number = 200;
export const DUE_AMOUNT_FOR_REMIND: number = 150;
export const MAXIMUM_WEEKLY_CANCEL_LIMIT: number = 7;
export const RATING_PANALTY: number = 0.2;
