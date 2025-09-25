import Stripe from 'stripe';
import config from '../../config';

const stripe = new Stripe(config.stripe.stripe_secret_key as string, {
     // apiVersion: '2025-05-28.basil',
     apiVersion: '2025-08-27.basil',
});

export default stripe;
