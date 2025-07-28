import { IPaymentCard } from "./paymentCard.interface";
import { PaymentCard } from "./paymentCard.model";

export const findMatchedPaymentCard = async (cardNo: string, userId: string): Promise<IPaymentCard | null> => {
    // check same card already submitted by user
    const cardsOfUser = await PaymentCard.find({ user: userId }).populate('user', 'full_name email').select('+cardNo').lean();
    if (!cardsOfUser || cardsOfUser.length === 0) {
        return null;
    }
    let matchedPaymentCard: IPaymentCard | null = null;
    for (const card of cardsOfUser) {
        const result = await PaymentCard.isMatchCardNo(cardNo, card.cardNo);
        if (result) {
            matchedPaymentCard = card;
            break;
        }
    }
    return matchedPaymentCard;
}