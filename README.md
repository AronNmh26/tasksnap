# TaskSnap

A cross-platform task management app for quick task capture and daily planning.

Built with **React Native** (Expo) and **Firebase**.

## Features

- **Camera Capture** — Built-in camera workflow with flash toggle and gallery import
- **Task Review** — Review photo task details, set category, and set due date/time before saving
- **Quick Add Task** — Create tasks without camera; image remains optional
- **Dashboard** — Dynamic date heading, task stats, date filtering, and swipe-to-delete
- **Authentication** — Email/password, Google, Facebook, and Guest access
- **Account Recovery** — Forgot password via Firebase Auth reset email
- **Settings** — Theme preferences and app settings
- **Cross-Platform** — Runs on iOS, Android, and Web
- **Offline-Ready** — Zustand stores with AsyncStorage persistence
- **Note** — AI photo identification is not included in this version

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Expo SDK 54, React Native 0.81 |
| Language | TypeScript 5.9 |
| Auth & DB | Firebase 12 (Auth + Firestore) |
| State | Zustand 5 |
| Navigation | React Navigation 7 (native-stack + bottom-tabs) |
| UI | Custom themed components, react-native-svg |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/) (`npx expo`)

### Installation

```bash
git clone https://github.com/AronNmh26/tasksnap.git
cd tasksnap
npm install
```

### Environment Setup

Create a `.env` file in the project root:

```env
# Add your Firebase/Auth configuration values here
```

### Running the App

```bash
# iOS (physical device via Expo Go)
npm run ios

# iOS with tunnel (if on different network)
npm run ios:tunnel

# Android
npm run android

# Web
npm run web

```

## Project Structure

```
tasksnap/
├── App.tsx                    # App root
├── src/
│   ├── appRoot/
│   │   └── navigation/        # RootNavigator, MainTabsNavigator, routes
│   ├── core/
│   │   ├── components/         # Shared components (DatePickerChips)
│   │   ├── theme/              # Theme provider, colors, spacing
│   │   ├── types/              # Task type definitions
│   │   ├── ui/                 # AppLogo SVG component
│   │   └── utils/              # Date helpers
│   ├── features/
│   │   ├── auth/               # Login, auth store (email/Google/Facebook)
│   │   ├── camera/             # CameraCaptureScreen
│   │   ├── home/               # HomeScreen, ProfileScreen
│   │   ├── settings/           # SettingsScreen, settings store
│   │   └── tasks/              # Dashboard, QuickCapture, TaskReview, TaskDetails, stores
│   ├── services/
│   │   ├── db.ts               # Firestore CRUD (native)
│   │   ├── db.web.ts           # Firestore CRUD (web)
│   │   ├── firebase.ts         # Firebase config & initialization
│   │   └── notifications.ts   # Push notification helpers
│   └── models/
├── assets/                    # Icons, splash images
└── app.json                   # Expo configuration
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start Expo dev server |
| `npm run ios` | Start on iOS |
| `npm run android` | Start on Android |
| `npm run web` | Start web version |
| `npm run ios:tunnel` | Start iOS with tunnel |
| `npm run android:tunnel` | Start Android with tunnel |
| `npm run export:web` | Export static web build to `dist/` |
| `npm run deploy:firebase` | Export web build and deploy Firebase Hosting |

## Deploy to Firebase Hosting

1. Install Firebase CLI (one-time):

```bash
npm install -g firebase-tools
```

2. Log in and select your Firebase project:

```bash
firebase login
firebase use --add
```

3. Build and deploy:

```bash
npm run deploy:firebase
```

This project includes `firebase.json` configured for Expo web output (`dist/`) and SPA routing rewrites.

4. Google Auth (web) setup in Google Cloud Console:
- Add `https://tasksnap-bdaa2.web.app` to **Authorized JavaScript origins**
- Add `https://tasksnap-bdaa2.web.app/__/auth/handler` to **Authorized redirect URIs**

## License

MIT
