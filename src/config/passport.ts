import passport from 'passport';
// import { Strategy as FacebookStrategy } from 'passport-facebook';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import config from '.';
import { USER_ROLES } from '../app/modules/user/user.enums';
import { User } from '../app/modules/user/user.model';
import { logger } from '../shared/logger';

/** steps to create g auth 02
 * go to link : https://console.cloud.google.com/projectselector2/iam-admin/settings?organizationId=0&inv=1&invt=Ab1eTg&supportedpurview=project,organizationId,folder&orgonly=true
 * click "create project" at top right
 * give project name e.g "kappes2" and no location need to select now click create. you will get a notification click select project on that or goto this link: https://console.cloud.google.com/projectselector2/iam-admin/settings?organizationId=0&inv=1&invt=Ab1eTg&supportedpurview=project,organizationId,folder&orgonly=true
 * slecte the recent created project i.e "kappes2"
 * click on the righ-left hambarger menu icon it will pop up  the side bar
 * click on the "APIs & Services" >> "Enabled Api and services"
 * click on "OAuth consent screen" from the left side bar
 * click "Get started"
 * give app name e.g "kappes2App" and give user support email e.g "asifaowadud@gmail.com" >>next audienc>>  click "External" >>next contact info>> email address e.g "asifaowadud@gmail.com" >>next finish >> tik on agree checkbox >> click continue >> click "create"
 * click "Create 0Auth client"
 * select Applicaiton type as "Web application" >>next name >> give name e.g "kappes2App" >>next Authorized redirect URIs >> give url e.g "http://localhost:3000/api/v1/auth/google/callback" >>next>> click "Create"
 * a pop up will open copy the clinet id and click "OK" >> it will automatically redirect to link : https://console.cloud.google.com/auth/clients?inv=1&invt=Ab1egg&orgonly=true&project=kappes2&supportedpurview=project,organizationId,folder
 * select the recent created project i.e "kappes2App" from the table list it will redirect to link : https://console.cloud.google.com/auth/clients/3728050386-jtd9meu32rbkq1994sq4s9b9kninhofv.apps.googleusercontent.com?inv=1&invt=Ab1egg&orgonly=true&project=kappes2&supportedpurview=project,organizationId,folder
 * at middle right will get the client id and client secret copy them and paste them in the config file
 *
 * Client ID = 3728050386-jtd9meu32rbkq1994sq4s9b9kninhofv.apps.googleusercontent.com
 * Client secret = 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
 *
 */

// Google OAuth Strategy
passport.use(
     new GoogleStrategy(
          {
               clientID: config.social.google_client_id as string,
               clientSecret: config.social.google_client_secret as string,
               callbackURL: `${config.backend_url}/api/v1/auth/google/callback`,
               // proxy: true, // Add this line if you're behind a proxy
               // passReqToCallback: true, // Add this to access the request object in the callback
          },
          async (accessToken, refreshToken, profile: any, done: any) => {
               try {
                    console.log({ profile });
                    let user = await User.findOne({ googleId: profile.id });
                    console.log({ user });
                    let isNewUser = false;

                    if (!user) {
                         const newUser = {
                              googleId: profile?.id,
                              full_name: profile?.displayName,
                              provider: 'google',
                              email: profile?.emails && profile?.emails[0]?.value,
                              image: profile?.photos && profile?.photos[0]?.value,
                              verified: true,
                              role: USER_ROLES.USER,
                         };

                         console.log({ newUser });
                         user = await User.create(newUser);
                         console.log({ user });
                         isNewUser = true;
                    }

                    // Add the isNewUser flag to the user object
                    const userWithIsNewUser = { ...user.toObject(), isNewUser };

                    return done(null, userWithIsNewUser);
               } catch (error) {
                    logger.error(error, 'Error in Google Strategy');
                    done(error, undefined);
               }
          },
     ),
);

// Facebook OAuth Strategy
// passport.use(
//      new FacebookStrategy(
//           {
//                clientID: config.social.facebook_client_id as string,
//                clientSecret: config.social.facebook_client_secret as string,
//                callbackURL: `${config.backend_url}/api/v1/auth/facebook/callback`,
//                profileFields: ['id', 'displayName', 'photos', 'email'],
//           },
//           async (accessToken, refreshToken, profile, done) => {
//                try {
//                     let user = await User.findOne({ facebookId: profile.id });
//                     let isNewUser = false;

//                     if (!user) {
//                          const newUser = {
//                               facebookId: profile?.id,
//                               full_name: profile?.displayName,
//                               provider: 'facebook',
//                               email: profile?.emails && profile?.emails[0]?.value,
//                               image: profile?.photos && profile?.photos[0]?.value,
//                               verified: true,
//                               role: USER_ROLES.USER,
//                          };

//                          user = await User.create(newUser);
//                          isNewUser = true;
//                     }

//                     // Add the isNewUser flag to the user object
//                     const userWithIsNewUser = { ...user.toObject(), isNewUser };

//                     return done(null, userWithIsNewUser);
//                } catch (error) {
//                     logger.error(error, 'Error in Facebook Strategy');
//                     done(error, null);
//                }
//           },
//      ),
// );

// Serialize & Deserialize User
passport.serializeUser((user: any, done) => {
     try {
          console.log('---------------- inside serializeUser ----------------');
          done(null, user._id); // save the user id to the session
     } catch (error) {
          logger.error(error, 'Error in Serialize User');
          done(error, null);
     }
});

passport.deserializeUser(async (id, done) => {
     try {
          console.log('----------------inside deserializeUser----------------, id: ', id, '----------------');
          const user = await User.findById(id);
          if (!user) {
               return done(null, false);
          }
          done(null, user); // save the user to req.user
     } catch (error) {
          logger.error(error, 'Error in De-serialize User');
          return done(error);
     }
});

export default passport;
