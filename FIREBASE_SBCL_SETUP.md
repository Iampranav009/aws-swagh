# Firebase SBCL invitation setup

1. In Firebase Authentication, enable **Email/Password** and **Email link**. The email link verifies the invitation once; the SBCL must create a password before dashboard access is activated.
2. Add the production website domain to Authentication > Settings > Authorized domains.
3. Create a Cloud Firestore database.
4. Deploy `firestore.rules` with the Firebase CLI or paste the rules into the Firebase console.
5. Sign in once with the intended admin account and copy its Firebase Authentication UID.
6. In Firestore, create the document `admins/{ADMIN_UID}`. Its fields may include `email` and `role: "admin"`; authorization is based on the document's existence.
7. Open `/admin`, sign in using that account, and invite an SBCL using their email and unique three-character code.

The verification email returns to `/sbcl/verify`. The invited user adds their name and creates a password. Firebase links that password to the email-verified account, then the app creates `sbclProfiles/{UID}` with the invited email and assigned SBCL code.

For production-grade email branding, rate limits, invitation expiry, revocation, and abuse prevention, move invitation creation and email delivery into a Firebase callable Cloud Function and enable App Check.
