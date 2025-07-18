
// 
//  * যখন কোণ booking create হবে তখন তার default booking.status হবে pending 
//  * যখন কোণ bid create হবে তখন তার default bid.status হবে pending 
//  * যখন কোণ booking accept হবে তখন তার default booking.status হবে confirmed আর যেই bid.id accept হল তখন তার default bid.status হবে accepted এবং তাছাড়া ঐ booking._id এর against এ যত গুলো booking আছে সেগুলো booking.status হবে rejected
//  * user যখন কোণ booking cancel হবে তখন তার default booking.status হবে cancelled আর যেই booking.acceptedBid এর  status হবে cancelled with reason
//  * provider যখন কোণ booking cancel হবে তখন তার default booking.status হবে pending আর যেই booking.acceptedBid এর  status হবে cancelled with reason পাশাপাশি এই booking._id এর against এ যত গুলো bid আছে সেগুলো bid.status হবে pending + user& ঐসব provider রা notificatio পাবে
//  

export enum BOOKING_STATUS {
    PENDING = 'pending', // bid not accepted need accept first
    CONFIRMED = 'confirmed', // bid accepted but not started so bidChange allowed
    ON_THE_WAY = 'on the way',
    WORK_STARTED = 'work started',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
}

export enum PAYMENT_METHOD {
    UNSPECIFIED = 'unspecified',
    CASH = 'cash',
    ONLINE = 'online',
}

export enum PAYMENT_STATUS {
    UNPAID = 'unpaid',
    PAID = 'paid',
    REFUNDED = 'refunded',

}
