export const DEFAULT_ADMIN_REVENUE: number = 20;
export enum DEFAULT_CURRENCY {
    BDT = 'bdt',
    USD = 'usd',
}
// 
//  * যখন কোণ booking create হবে তখন তার default booking.status হবে pending 
//  * যখন কোণ bid create হবে তখন তার default bid.status হবে pending 
//  * যখন কোণ booking accept হবে তখন তার default booking.status হবে confirmed আর যেই bid.id accept হল তখন তার default bid.status হবে accepted এবং তাছাড়া ঐ booking._id এর against এ যত গুলো booking আছে সেগুলো booking.status হবে rejected
//  * user যখন কোণ booking cancel হবে তখন তার default booking.status হবে cancelled আর যেই booking.acceptedBid এর  status হবে cancelled with reason
//  * provider যখন কোণ booking cancel হবে তখন তার default booking.status হবে pending আর যেই booking.acceptedBid এর  status হবে cancelled with reason পাশাপাশি এই booking._id এর against এ যত গুলো bid আছে সেগুলো bid.status হবে pending + user& ঐসব provider রা notificatio পাবে
//  
export enum BID_STATUS {
    PENDING = 'pending', // can be accepted for any booking
    ACCEPTED = 'accepted', // accepted for any booking but can booking can change yet
    REJECTED = 'rejected',
    ON_THE_WAY = 'on the way',
    WORK_STARTED = 'work started',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
}
