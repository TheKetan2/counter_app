# TallyFlow

A mobile-first, installable, offline-first counter PWA built with Next.js, TypeScript, Dexie/IndexedDB and Framer Motion.

## Features
- Multiple counters for gym reps, nam japa, habits, inventory and general tallying
- Custom names, categories, goals, increment step, milestone interval, colour and feedback settings
- Fast increment/decrement, undo, reset, session timer with start/pause
- Goal and milestone celebrations, badges, lifetime and recent activity statistics
- Light, dark and system theme
- Local-first IndexedDB persistence; no account or backend
- JSON export/import backup
- PWA manifest and service worker for install and offline shell caching

## Run locally
Requires Node.js 18.17+.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Production build
```bash
npm run build
```

Next.js exports the static site to `out/`. Deploy the contents of `out/` to any static host over HTTPS (Vercel, Netlify, Cloudflare Pages, GitHub Pages, etc.).

### GitHub Pages
The GitHub Actions workflow builds the project with the `/counter_app` base path and deploys it to [https://theketan2.github.io/counter_app/](https://theketan2.github.io/counter_app/) whenever a commit is pushed to `main`. In the repository's **Settings → Pages**, set the build and deployment source to **GitHub Actions**.

## Install
- Android/desktop Chromium: use the browser's Install app prompt or menu.
- iPhone/iPad: open the HTTPS site in Safari → Share → Add to Home Screen.

## Data and privacy
Counters and activity are stored in IndexedDB on this device. Clearing site data, uninstalling the browser or losing the device can remove local data. Use Settings → Export backup regularly. Restoring a backup replaces the current local counters, events and achievements.

## Important implementation notes
- Service workers and installability require HTTPS in production (localhost is exempt).
- The service worker caches the app shell and same-origin assets as they are first requested. First visit requires network access; revisit once while online before relying on offline launch.
- The UI uses an external Google Fonts stylesheet as progressive enhancement; system sans-serif fonts remain available offline.
- Browser storage is best-effort. For critical records, export backups and consider cloud sync in a future version.

\n## Troubleshooting counter creation\nIf a save fails, the create/edit dialog now stays open and displays the IndexedDB error. Open browser DevTools → Console for the detailed diagnostic. Ensure the site is running on localhost or HTTPS and that browser site storage is not blocked/private-restricted.\n
\n## Database schema migration\nVersion 2 adds the missing `createdAt` index on the counters table. Dexie upgrades an existing version-1 database automatically when the app is opened. Do not clear site data just to apply this migration; allow the app to reload and upgrade its database.\n

### Android APK
With Node.js 20+, JDK 17+, and Android SDK installed, run:

```bash
npm ci
npm run android:apk
```

The installable debug APK is generated at `android/app/build/outputs/apk/debug/app-debug.apk`. GitHub Actions also attaches an APK artifact to each successful Android build.
