# RO Plant Quotation Generator — Firebase team edition

This package keeps the existing quotation editor and export features, adds Firebase Hosting, Firebase Authentication (email/password) and a shared Cloud Firestore quotation library.

## 1. Create and configure Firebase

1. Open https://console.firebase.google.com/ and create a Firebase project.
2. Add a **Web app** in Project settings → General → Your apps.
3. Copy the Firebase web configuration into `firebase-config.js`. Replace all placeholder values.
4. In Build → Authentication → Sign-in method, enable **Email/Password**.
5. In Authentication → Users, create one account for each team member. This app intentionally has no public sign-up screen.
6. In Build → Firestore Database, create a database (production mode is fine). Choose a region close to your users.
7. Deploy the included Firestore rules (step 3 below).

## 2. Install the Firebase CLI

Install Node.js, then run:

```bash
npm install
npx firebase login
```

## 3. Connect this folder to your Firebase project

Run from this folder:

```bash
npx firebase use --add
```

Select the project you created and set the alias to `default`. This creates `.firebaserc` locally. Do not commit personal credentials.

Deploy the database rules and website:

```bash
npx firebase deploy --only firestore:rules,hosting
```

Firebase will show your Hosting URL, normally `https://PROJECT_ID.web.app`.

## 4. Existing quotations / migration

- The app keeps its original browser `localStorage` and JSON backup/restore.
- On the first successful team sign-in, the app merges that browser's saved quotation library with Firestore. The newer copy wins when the same quotation reference exists.
- If the existing quotations are in another browser or computer, first open the old app there, click **Backup (.json)**, then open the Firebase-hosted app, sign in, choose **Restore backup**, and select that JSON file. The restored library is then synchronized to Firestore.
- The migration does not upload the currently open unsaved draft; click **Save quote** first.

## 5. Team access and security

- Create accounts manually in Firebase Authentication for approved team members. Do not enable public account creation.
- Firestore rules allow authenticated users to access the shared `quotations` collection. Therefore, only provision trusted team accounts in this Firebase project.
- The Firebase web config is public client configuration, not a secret. Never place service-account JSON, private keys, or Admin SDK credentials in this website.
- The included rules require sign-in but do not implement per-user roles or audit history. If you later need role-based permissions or stricter allowlisting, add server-side authorization / per-user UID allowlists before inviting a wider audience.

## 6. Test

1. Open the Firebase Hosting URL.
2. Sign in with an account created in Firebase Authentication.
3. Save a quotation and check Firestore → Data → `quotations`.
4. Sign in from another device with a second team account and confirm the shared quotation appears.

## Notes

- The Firebase JavaScript SDK is loaded as browser ES modules from Google's CDN; the existing app's classic script and quotation-generation logic are retained.
- PDF/print, Word, HTML export, and JSON backup/restore remain part of the original app.
- Firestore sync needs an internet connection. Local browser saving continues to work when cloud access is unavailable.
