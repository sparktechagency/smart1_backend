import config from "../../../config";

export const failureRedirectUrl = `${config.backend_url}/api/v1/auth/login?auth=failed`
export const successRedirectUrl = `${config.backend_url}/api/v1/users/profile?auth=success`
