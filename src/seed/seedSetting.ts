import mongoose from 'mongoose';
import Settings from '../app/modules/settings/settings.model';
import config from '../config';
import { logger } from '../shared/logger';

// Interface for seed data (without Mongoose Document properties)
interface ISettingsSeed {
    privacyPolicy: string;
    aboutUs: string;
    support: string;
    termsAndConditions: string;
    appVersion: string;
    contactInfo: {
        email: string;
        phone: string;
        address: string;
        facebook?: string;
        twitter?: string;
        instagram?: string;
        linkedin?: string;
        whatsapp?: string;
    };
}

// Settings data for seeding
const settingsData: ISettingsSeed[] = [
    {
        privacyPolicy: '<a href="/privacy-policy" title="Read our Privacy Policy"><h4>سياسة الخصوصية</h4><p>تعرف على كيفية جمع وحماية بياناتك الشخصية عند استخدام تطبيق Smart S1.</p></a>',
        aboutUs: '<a href="/about-us" title="Learn more about Smart S1"><h4>من نحن</h4><p>نحن في Smart S1 نسعى لتوفير أفضل الخدمات الرقمية للمجتمع السعودي من خلال تقنيات مبتكرة.</p></a>',
        support: '<a href="/support" title="Customer Support"><h4>الدعم الفني</h4><p>إذا كنت بحاجة إلى مساعدة، تواصل مع فريق الدعم الفني للحصول على الإجابة على جميع استفساراتك.</p></a>',
        termsAndConditions: '<a href="/terms-and-conditions" title="Read our Terms & Conditions"><h4>الشروط والأحكام</h4><p>يرجى قراءة الشروط والأحكام بعناية قبل استخدام تطبيق Smart S1. هذه الشروط تنظم استخدامك للخدمات.</p></a>',
        appVersion: '1.0.0',
        contactInfo: {
            email: 'info@smart-s1.com',
            phone: '+966 123 456 789',
            address: '123 Smart Street, Riyadh, Saudi Arabia',
            facebook: 'https://www.facebook.com/smart-s1',
            twitter: 'https://twitter.com/smart_s1',
            instagram: 'https://www.instagram.com/smart_s1',
            linkedin: 'https://www.linkedin.com/company/smart-s1',
            whatsapp: '+880123456789',
        },
    },
];

// Function to seed settings
const seedSettings = async () => {
    try {
        await Settings.deleteMany();
        await Settings.insertMany(settingsData);
        console.log('Settings seeded successfully!');
    } catch (err) {
        console.error('Error seeding settings:', err);
    }
};

// Main seeding function
const seedSettingsData = async () => {
    try {
        console.log('--------------> Database seeding start <--------------');
        await seedSettings();

        console.log('--------------> Database seeding completed <--------------');
    } catch (error) {
        logger.error('Error creating settings:', error);
    } finally {
        mongoose.disconnect();
    }
};

// Connect to MongoDB and run the seeding
mongoose
    .connect(config.database_url as string)
    .then(() => seedSettingsData())
    .catch((err) => console.error('Error connecting to MongoDB:', err));
