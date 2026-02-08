<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1XlxoF9JboSeWVYJt2X6vPz4jso2-9lJP

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Build & Deploy (Firebase Hosting)

1. Install the Firebase CLI globally (optional for local deploy):

```bash
npm install -g firebase-tools
```

2. Login and initialize (only once):

```bash
firebase login
firebase init hosting
```

3. Build for production:

```bash
npm run build
```

4. Deploy (local):

```bash
npm run deploy
```

5. GitHub Actions: I added a workflow at `.github/workflows/firebase-hosting.yml`.
   Create a repository secret named `FIREBASE_SERVICE_ACCOUNT` with your
   Firebase service account JSON (or adjust workflow to use `FIREBASE_TOKEN`).

