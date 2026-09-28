# 🌟 ANIME.PLUS — Ultra HD Anime Streaming Web & Mobile App

> **Stream the latest anime simulcasts, blockbuster 3D movies, and official trailers in Full HD with an ad-free experience.**

[![GitHub Pages](https://img.shields.io/badge/Deploy-GitHub%20Pages-brightgreen?logo=github)](https://pages.github.com/)
[![PWA Ready](https://img.shields.io/badge/PWA-Installable-FF640A?logo=pwa)](https://web.dev/progressive-web-apps/)
[![Cross-Platform](https://img.shields.io/badge/App-Android%20%7C%20iOS%20%7C%20Desktop-blue)](https://capacitorjs.com/)

---

## 📱 Features & Highlights

- **✨ Modern Anime Aesthetic**: Dark-themed UI with Crunchyroll/Netflix anime styling, vibrant orange & crimson glowing accents, and smooth glassmorphism.
- **🎬 Official Trailers Hub (`trailers.html`)**: Watch trailers, PVs, and season teasers with auto-fallback to official YouTube streams.
- **🎥 3D Anime Cinema (`movies.html`)**: Blockbuster theatrical movies showcase featuring interactive 3D perspective tilt effects.
- **⚡ Custom Video Player (`watch.html`)**:
  - Full HD 1080p, 720p, 480p quality selection.
  - Multi-audio tracks (Japanese Original & English Dub).
  - Playback speed control (0.75x to 1.5x).
  - Quick skip intro (+85s) and 10s forward/rewind.
  - Autoplay countdown timer for next episode.
- **📱 Installable as an App (PWA & Native)**:
  - Install directly from browser onto Android, iOS, Windows, and Mac with 1 click.
  - Standalone app mode with custom app icon and splash screen.
  - Offline asset caching with Service Worker (`sw.js`).
  - Pre-configured `capacitor.config.json` to build native Android `.apk` / iOS app in 1 command.
- **🔐 Multi-Method Authentication (`login.html`, `register.html`, `profile.html`)**:
  - Email OTP, Mobile SMS/WhatsApp OTP, and Password login.
  - Profile avatar selection, watch statistics, and watchlist queue management.
  - Dual-mode: Backend REST API + automatic client simulation fallback for 100% serverless hosting.

---

## 🚀 How to Deploy to GitHub Pages (Free Hosting)

Deploying ANIME.PLUS to GitHub Pages is fast and 100% free:

### Method 1: Push to GitHub Repository (Recommended)

1. **Initialize Git & Commit**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of ANIME.PLUS streaming app"
   ```

2. **Add Your GitHub Remote**:
   ```bash
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
   git push -u origin main
   ```
   *(Note: The file `attack-on-titan-trailer.mp4` is already protected in `.gitignore` so you will never exceed GitHub's 100MB limit).*

3. **Enable GitHub Pages**:
   - Go to your repository on [GitHub](https://github.com).
   - Click **Settings** (tab at top).
   - In the left sidebar, click **Pages**.
   - Under **Build and deployment > Source**:
     - Select **GitHub Actions** (the included `.github/workflows/deploy.yml` will automatically build and publish).
     - *OR* select **Deploy from a branch** -> branch `main` -> folder `/ (root)` -> Click **Save**.
   - Your website will be live in ~60 seconds at:
     `https://YOUR_USERNAME.github.io/YOUR_REPOSITORY/`

---

## 📲 How to Turn Into an App (Install on Phone or PC)

### Option 1: Instant PWA Install (No App Store Needed)

#### On Android / Google Chrome / Microsoft Edge:
1. Open your deployed website URL in Chrome or Edge.
2. Click the **📱 Install App** button in the top navigation bar, or tap the **Install** prompt banner at the bottom.
3. Tap **Install**. The ANIME.PLUS icon will appear on your phone home screen or desktop launcher, opening in full-screen standalone app mode!

#### On iPhone / iPad (Safari):
1. Open the website in **Safari**.
2. Tap the **Share** button (box with an upward arrow `⎋`) at the bottom.
3. Scroll down and tap **Add to Home Screen ⊞**.
4. Tap **Add** in the top right. ANIME.PLUS will now launch as a full-screen iOS app!

---

### Option 2: Build a Native Android APK (Using Capacitor)

You can convert this repository into a native Android Studio project and compile an `.apk`:

1. **Install Capacitor CLI**:
   ```bash
   npm install @capacitor/core @capacitor/cli @capacitor/android
   ```

2. **Initialize Android Platform**:
   ```bash
   npx cap add android
   ```

3. **Sync Web Assets**:
   ```bash
   npx cap copy
   ```

4. **Open in Android Studio & Build APK**:
   ```bash
   npx cap open android
   ```
   In Android Studio, click **Build > Build Bundle(s) / APK(s) > Build APK(s)** to generate your installable Android `.apk` file!

---

## 📂 Project Structure

```text
anime-hub/
├── 404.html              # Custom 404 Multiverse page for GitHub Pages
├── .nojekyll             # Tells GitHub Pages to serve all assets directly
├── manifest.json         # PWA Web App Manifest (display: standalone, theme, icons)
├── sw.js                 # Service Worker for offline caching & fast app launch
├── capacitor.config.json # Configuration for native Android / iOS builds
│
├── index.html            # Home page with hero spotlight & carousels
├── browse.html           # Full anime catalog with filters and genre chips
├── watch.html            # Custom video player with audio/quality/speed controls
├── movies.html           # 3D blockbuster anime cinema showcase
├── trailers.html         # Official anime trailers and PV hub
├── schedule.html         # Weekly simulcast release calendar
├── watchlist.html        # Bookmarked queue & watch history
├── premium.html          # VIP subscription tier plans
├── login.html            # Multi-method login (Password, Email OTP, Mobile OTP)
├── register.html         # User registration with avatar setup
├── profile.html          # User profile, statistics, and theme settings
│
├── css/
│   ├── main.css          # Design system, theme colors, typography, reset
│   ├── navbar.css        # Desktop navbar, mobile bottom bar, install modal
│   ├── hero.css          # Spotlight carousel & timer indicators
│   ├── cards.css         # 3D perspective anime cards & carousel rows
│   ├── player.css        # Custom Crunchyroll-style player UI
│   ├── browse.css        # Catalog filters and grid layouts
│   ├── auth.css          # Login/registration card styles
│   └── wallpaper.css     # Live wallpaper modal styles
│
├── js/
│   ├── anime-data.js     # Comprehensive anime database & catalog
│   ├── app.js            # Main controller, PWA installer, search, trailer modal
│   ├── player.js         # Video player engine, episodes sidebar, discussion
│   ├── browse.js         # Catalog filtering and sorting engine
│   ├── schedule.js       # Simulcast schedule day-tab renderer
│   ├── watchlist.js      # Watchlist bookmark & history manager
│   ├── auth.js           # Multi-method authentication & simulated backend
│   ├── anime-3d.js       # Interactive 3D card tilt perspective engine
│   └── live-wallpaper.js # Animated live video wallpaper manager
│
├── img/
│   ├── icon.svg          # Crisp vector brand logo
│   ├── icon-192.png      # 192x192 PWA app icon
│   ├── icon-512.png      # 512x512 PWA app icon
│   ├── icon-maskable-512.png # 512x512 Android adaptive maskable icon
│   └── banners/          # High-resolution anime hero banners & video trailers
│
└── .github/workflows/
    └── deploy.yml        # Automatic GitHub Pages deployment workflow
```

---

## 💻 Local Development

Simply open `index.html` in any web browser, or start a local development server:

```bash
# Using Python
python -m http.server 8000

# Using Node (npx)
npx serve .
```

Open `http://localhost:8000` to stream!
