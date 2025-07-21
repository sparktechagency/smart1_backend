import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import stripe from "../../config/stripe.config";
import { IJwtPayload } from "../auth/auth.interface";
import { StripeAccount } from "./stripeAccount.model";
import { stripeAccountService } from "./stripeAccount.service";


const createStripeAccount = catchAsync(async (req: Request, res: Response) => {
  const result = await stripeAccountService.createConnectedStripeAccount(
    req.user as IJwtPayload,
    req.get('host') || '',
    req.protocol,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Stripe account created',
    data: result,
  });
});

const successPageAccount = catchAsync(async (req: Request, res: Response) => {
  // console.log('payment account hit hoise');
  const { id } = req.params;
  const account = await stripe.accounts.update(id, {});
  // console.log('account', account);

  if (
    account?.requirements?.disabled_reason &&
    account?.requirements?.disabled_reason.indexOf('rejected') > -1
  ) {
    return res.redirect(
      `${req.protocol + '://' + req.get('host')}/api/v1/stripe/refreshAccountConnect/${id}`,
    );
  }
  if (
    account?.requirements?.disabled_reason &&
    account?.requirements?.currently_due &&
    account?.requirements?.currently_due?.length > 0
  ) {
    return res.redirect(
      `${req.protocol + '://' + req.get('host')}/api/v1/stripe/refreshAccountConnect/${id}`,
    );
  }
  if (!account.payouts_enabled) {
    return res.redirect(
      `${req.protocol + '://' + req.get('host')}/api/v1/stripe/refreshAccountConnect/${id}`,
    );
  }
  if (!account.charges_enabled) {
    return res.redirect(
      `${req.protocol + '://' + req.get('host')}/api/v1/stripe/refreshAccountConnect/${id}`,
    );
  }
  // if (account?.requirements?.past_due) {
  //     return res.redirect(`${req.protocol + '://' + req.get('host')}/payment/refreshAccountConnect/${id}`);
  // }
  if (
    account?.requirements?.pending_verification &&
    account?.requirements?.pending_verification?.length > 0
  ) {
    // return res.redirect(`${req.protocol + '://' + req.get('host')}/payment/refreshAccountConnect/${id}`);
  }
  await StripeAccount.updateOne({ accountId: id }, { isCompleted: true });

  res.render('success-account.ejs');
});

const refreshAccountConnect = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const url = await stripeAccountService.refreshAccountConnect(
    id,
    req.get('host') || '',
    req.protocol,
  );
  res.redirect(url);
});

const onConnectedStripeAccountSuccess = catchAsync(async (req: Request, res: Response) => {
  const result = await stripeAccountService.onConnectedStripeAccountSuccess(
    req.params.accountId,
  );
  res.send(result);
});

export const stripeAccountController = {
  createStripeAccount,
  successPageAccount,
  refreshAccountConnect,
  onConnectedStripeAccountSuccess
};
