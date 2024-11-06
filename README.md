## 2.4 System Organisation & Navigation

The DMS interface is organized into the following main sections:

- **Dashboard**: Provides an overview of current drought conditions and alerts. It also displays real-time data from sensors and weather stations. Lastly, it provides customizable reports based on current data.
- **Account**: Includes system configuration, user management, and alert setup.

More information about the system's main sections is provided below:

![Alt text](/Resources/register.png?raw=true "Dashboard")
- If this is the user's first time on the application, or if they would like to create a new account, they will be required to complete all user details, notification preferences, and acknowledgements to register an account correctly. This process is illustrated below.

- If users enable two-factor authentication (2FA), they will be presented with a unique 2FA secret key, which will be used to complete the 2FA setup via an authenticator application (such as Google Authenticator). Once the key is entered into the authenticator application, a one-time password (OTP) will be generated. This process is described below.

- Users will need to enter the OTP twice for verification purposes. Once this is completed, users can go back to log in and sign into their account. Each time a user signs into their account, they will be required to enter their OTP before gaining access to the application. This process is shown below.

- Once the sign-up process is completed, users will see the following screen. If a user has an existing account, they can sign in by entering their email address and password, signing in via their Google account, or signing in via their fingerprint. If 2FA is enabled, users will need to enter their OTP once during the signing process.

- The two images above display the home page and dashboard of the application. Users will only be presented with these pages once they have created and logged into an account. The homepage displays a world map indicating weather intensity. The dashboard shows the current weather conditions with a world map and an AI-based drought prediction planner.

- The two images above show the account screen. Here, users can update and manage account details such as their email address, personal information, and password. Users can also enable two-factor authentication to enhance account security. Additionally, an option to delete the account is available. Any updates or changes made to an account on this screen will be reflected in the database as well.
