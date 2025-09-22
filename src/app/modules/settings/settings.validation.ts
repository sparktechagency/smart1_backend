import { z } from "zod";

export const settingsValidation = {
    createOrUpdateSettingsSchema: z.object({
        body: z.object({
            privacyPolicy: z.string().optional(), // these will be html
            aboutUs: z.string().optional(), // these will be html
            support: z.string().optional(), // these will be html
            accountDeletePolicy: z.string().optional(), // these will be html
            termsAndConditions: z.string().optional(), // these will be html
            appVersion: z.string().optional(),
        })
    }),
}