# Verified ratings setup

1. Open [Firebase Console](https://console.firebase.google.com/) and create a project.
2. Add a Web app, then copy its Firebase configuration object.
3. In **Authentication → Sign-in method**, enable **Google**.
4. In **Authentication → Settings → Authorized domains**, add `aditya-raj-18.github.io`.
5. In **Firestore Database**, create a Cloud Firestore database.
6. Replace the contents of `firebase-config.js` with your configuration:

```js
window.FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

7. In **Firestore Database → Rules**, publish these rules:

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /portfolioRatings/{userId} {
      allow read: if true;
      allow create, update: if request.auth != null
        && request.auth.uid == userId
        && request.resource.data.uid == request.auth.uid
        && request.resource.data.name is string
        && request.resource.data.rating is int
        && request.resource.data.rating >= 1
        && request.resource.data.rating <= 5;
      allow delete: if false;
    }
  }
}
```

8. Commit and publish `index.html`, `script.js`, `rating-card.css`, and `firebase-config.js` to GitHub.

The Firebase configuration identifies your web app but is not a secret. Never add Firebase service-account keys to this project.
