require("dotenv").config();

// Helper function to encode data into Base64
const encodeData = (data: any) => {
  return Buffer.from(JSON.stringify(data)).toString('base64');
};

import { Response } from 'express';
import { failureRedirectUrl, successRedirectUrl } from '../app/modules/auth/auth.utils';

interface User {
  // Add user properties here based on your user object structure
  id: string;
  email: string;
  [key: string]: any;
}

const setSuccessDataAndRedirect = async (res: Response, user: User, token: string) => {
  // Encode the token and user data and in fronend use atob() to decode it
  const encodedData = encodeData({ user, token });

  // Construct the redirect URL with encoded data as a query parameter
  const redirectUrl = `${successRedirectUrl}&data=${encodedData}`;

  // Redirect the user to the frontend
  return res.redirect(redirectUrl);
};

// Function to handle errors and send a failure message in the redirect
const setErrorDataAndRedirect = async (res: Response, err: Error | null, user: User | null) => {
  let message = "An error occurred";
  if (err) message = err.message;
  if (!user) message = "Invalid credentials";

  // Encode the error message before passing it in the query string
  return res.redirect(`${failureRedirectUrl}&message=${encodeURIComponent(message)}`);
};

export const passportHandlers = { setSuccessDataAndRedirect, setErrorDataAndRedirect };
