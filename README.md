# TaskSnap

A smart task management app that uses **AI-powered image recognition** to create tasks from photos. Snap a picture of your surroundings and TaskSnap will automatically suggest relevant tasks.

Built with **React Native** (Expo), **Firebase**, and **Hugging Face** vision models.

## Features

- **AI Task Suggestions** — Take a photo and get instant, actionable task suggestions powered by the Molmo2-8B vision model
- **Camera Capture** — Built-in camera with quick-capture workflow
- **Smart Categorization** — Tasks are auto-categorized (Cleaning, Laundry, Kitchen, Health, Work, Errands, etc.)
- **Dashboard** — Time-based greeting, task stats, date filtering, and swipe-to-delete
- **Authentication** — Email/password, Google OAuth, and Facebook OAuth
- **Settings** — Default category, reminder preferences, AI auto-suggest toggle, dark/light theme
- **Cross-Platform** — Runs on iOS, Android, and Web
- **Offline-Ready** — Zustand stores with AsyncStorage persistence

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Expo SDK 54, React Native 0.81 |
| Language | TypeScript 5.9 |
| Auth & DB | Firebase 12 (Auth + Firestore) |
| State | Zustand 5 |
| AI | Hugging Face Inference (allenai/Molmo2-8B) |
| Navigation | React Navigation 7 (native-stack + bottom-tabs) |
| UI | Custom themed components, react-native-svg |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/) (`npx expo`)
- A [Hugging Face](https://huggingface.co/) account with an API token

### Installation

```bash
git clone https://github.com/YOUR_USERNAME/tasksnap.git
cd tasksnap
npm install
```

### Environment Setup

Create a `.env` file in the project root:

```env
EXPO_PUBLIC_HUGGINGFACE_API_TOKEN=your_hf_token_here

# Web only — route AI calls through local proxy to avoid CORS
EXPO_PUBLIC_AI_PROXY_URL=http://localhost:8787
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

# Web with AI proxy (required for web AI features)
npm run proxy   # terminal 1
npm run web     # terminal 2
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
│   │   ├── ai/screens/         # AIReviewScreen (image → task suggestions)
│   │   ├── auth/               # Login, auth store (email/Google/Facebook)
│   │   ├── camera/             # CameraCaptureScreen
│   │   ├── home/               # HomeScreen, ProfileScreen
│   │   ├── settings/           # SettingsScreen, settings store
│   │   └── tasks/              # Dashboard, QuickCapture, TaskDetails, stores
│   ├── services/
│   │   ├── ai.ts               # AI pipeline (vision → parse → categorize)
│   │   ├── aiLabel.ts          # Keyword-based task label suggestions
│   │   ├── db.ts               # Firestore CRUD (native)
│   │   ├── db.web.ts           # Firestore CRUD (web)
│   │   ├── firebase.ts         # Firebase config & initialization
│   │   └── notifications.ts   # Push notification helpers
│   └── models/
├── server/
│   ├── hf-proxy.js            # CORS proxy for web AI calls
│   └── dev-web.js             # Web dev server helper
├── assets/                    # Icons, splash images
└── app.json                   # Expo configuration
```

## AI Pipeline

1. **Camera Capture** → user takes a photo
2. **Vision Model** → image sent to Molmo2-8B via Hugging Face Inference API
3. **Parse & Sanitize** → response parsed into structured task suggestions with categories
4. **Review** → user sees suggestion chips, picks/edits tasks, sets due dates
5. **Save** → tasks stored in Firebase Firestore

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start Expo dev server |
| `npm run ios` | Start on iOS |
| `npm run android` | Start on Android |
| `npm run web` | Start web version |
| `npm run proxy` | Start AI CORS proxy (port 8787) |
| `npm run ios:tunnel` | Start iOS with tunnel |
| `npm run android:tunnel` | Start Android with tunnel |

## License

MIT
