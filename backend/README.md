# 🎌 CrunchyHub Backend - Complete Guide

## 🚀 Setup & Installation

### Prerequisites
- Node.js 18 or newer (required by Express 5)
- MongoDB Atlas Account (free)
- npm or yarn

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the backend directory:

```env
PORT=5000
MONGO_URI=mongodb+srv://username:password@your-cluster.mongodb.net/anime-hub?retryWrites=true&w=majority
CLIENT_ORIGINS=http://localhost:8000,https://your-site.example
JWT_SECRET=replace-with-at-least-32-random-characters
OTP_SECRET=replace-with-a-different-32-character-random-secret
NODE_ENV=development

# Email OTP (Resend). EMAIL_FROM must use a verified sender/domain.
RESEND_API_KEY=re_...
EMAIL_FROM=ANIME.PLUS <no-reply@your-verified-domain.example>

# SMS OTP (Twilio)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+15551234567

```

Copy `backend/.env.example` to `backend/.env` and replace every example value. Keep `.env` private. Email and SMS codes are sent by the backend; the browser no longer creates or displays demo codes. If a secret or delivery provider is missing, sending a code returns an unavailable message instead of pretending it was sent.

For a separate frontend host such as GitHub Pages, set `window.API_BASE_URL` in `js/api-config.js` to your backend URL ending in `/api`, then add the exact frontend origin to `CLIENT_ORIGINS`. GitHub Pages can host the installable PWA, but it cannot run the authentication server. The OTP request limiter is in memory on one server process; use a shared store before running multiple backend instances.

**🔐 Generate a secure JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Start the Server

**Development (with auto-reload):**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

Server runs at: `http://localhost:5000`

---

## 📚 API Endpoints

### Email and phone verification codes

`POST /api/auth/send-otp` accepts `type: "email"` with `email`, or `type: "mobile"` with an E.164 `phone` such as `+919876543210`. Phone verification sends SMS. Set `purpose` to `password_reset` only for the reset flow; normal sign-in uses `login`.

`POST /api/auth/verify-otp` accepts `email` or `phone`, the six-digit `otp`, `type`, and an optional `name`. Codes expire after 10 minutes, are stored as keyed hashes, are single use, and allow at most five incorrect attempts. Request and verification endpoints are rate limited. The current limiter is per server process, so use shared storage before scaling to multiple instances.

The server responds with a generic delivery message so callers cannot use the endpoint to check whether an account exists. Missing database or provider configuration returns an unavailable response; no OTP is generated in the browser or returned by the API.

### Authentication Endpoints

#### **Register User**
```
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Anime Fan",
  "email": "john@example.com",
  "password": "securePassword123",
  "confirmPassword": "securePassword123"
}

Response (201):
{
  "success": true,
  "message": "Account created successfully!",
  "token": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Anime Fan",
    "email": "john@example.com",
    "avatar": "...",
    "tier": "FAN"
  }
}
```

#### **Login User**
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securePassword123"
}

Response (200):
{
  "success": true,
  "message": "Logged in successfully!",
  "token": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": { ... }
}
```

#### **Refresh Access Token**
```
POST /api/auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "eyJhbGc..."
}

Response (200):
{
  "success": true,
  "token": "eyJhbGc..."
}
```

#### **Get Current User** (Protected)
```
GET /api/auth/me
Authorization: Bearer <token>

Response (200):
{
  "success": true,
  "user": { ... }
}
```

#### **Update Profile** (Protected)
```
PUT /api/auth/me
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "New Name",
  "avatar": "https://...",
  "tier": "MEGA FAN"
}

Response (200):
{
  "success": true,
  "message": "Profile updated successfully!",
  "user": { ... }
}
```

#### **Change Password** (Protected)
```
POST /api/auth/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "oldPassword": "currentPassword123",
  "newPassword": "newPassword456",
  "confirmPassword": "newPassword456"
}

Response (200):
{
  "success": true,
  "message": "Password changed successfully!"
}
```

#### **Logout** (Protected)
```
POST /api/auth/logout
Authorization: Bearer <token>
Content-Type: application/json

{
  "refreshToken": "eyJhbGc..."
}

Response (200):
{
  "success": true,
  "message": "Logged out successfully!"
}
```

---

## 🔒 Security Features

✅ **Password Hashing** - bcryptjs (10 salt rounds)
✅ **JWT Authentication** - Secure token-based auth
✅ **Refresh Tokens** - Dual-token system for security
✅ **Input Validation** - Email format & password requirements
✅ **Email Uniqueness** - Prevents duplicate registrations
✅ **OTP Delivery** - Resend email and Twilio SMS providers configured only on the server
✅ **OTP Storage** - Keyed hash, ten-minute expiry, one-time use, attempt and request limits
✅ **Secrets** - Startup requires configured JWT and OTP secrets
✅ **Protected Routes** - Bearer token middleware
✅ **Token Expiration** - 7 days for access, 30 days for refresh

---

## 🗄️ Database Schema

### User Model
```javascript
{
  _id: ObjectId,
  name: String (required, min 2 chars),
  email: String (required, unique, lowercase),
  password: String (required, hashed, min 6 chars),
  avatar: String (URL),
  tier: String (enum: FAN, MEGA FAN, ULTIMATE FAN),
  favorites: [String],
  watchlist: [String],
  watchHistory: [{
    animeId: String,
    episodeId: String,
    watchedAt: Date,
    progress: Number
  }],
  isEmailVerified: Boolean,
  lastLogin: Date,
  refreshTokens: [{
    token: String,
    expiresAt: Date
  }],
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🧪 Testing with cURL

### Register:
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123",
    "confirmPassword": "password123"
  }'
```

### Login:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Get Current User (replace TOKEN with actual token):
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer TOKEN"
```

---

## 🐛 Troubleshooting

### "MongoDB connection error"
- Check MONGO_URI in .env
- Verify MongoDB Atlas account is active
- Ensure IP whitelist includes your machine

### "Invalid refresh token"
- Token may have expired (30 days)
- User may have cleared browser storage
- Request new tokens by logging in again

### "Password must be at least 6 characters"
- Client-side validation in register.html
- Backend enforces minimum 6 characters

---

## 📝 Frontend Integration

The frontend communicates with the API via `js/auth.js`:

```javascript
// These functions handle all auth flows:
- registerUser(name, email, password, confirmPassword)
- loginUser(email, password)
- refreshAccessToken()
- logoutUser()
- getCurrentUser()
- getAuthToken()
- isUserLoggedIn()
```

Tokens are stored in localStorage:
- `crunchy_token` - Access token
- `crunchy_refresh_token` - Refresh token
- `crunchy_user` - User profile data

---

## 🎯 Before Launch

1. Set the database, JWT and OTP secrets, and email/SMS provider credentials in the backend host's private environment settings.
2. Set `CLIENT_ORIGINS` to the exact deployed frontend URL and set `window.API_BASE_URL` in `js/api-config.js` if the API is on another host.
3. If an older Google Apps Script or spreadsheet logger was deployed, disable it separately; this code no longer sends user details to that service.
4. Keep provider keys out of the repository and chat messages.

The old `backend/user_registrations_spreadsheet.csv` is still tracked in the repository. GitHub Pages and the Node server changes no longer publish it, but it can still be viewed from the public GitHub source until you decide whether to remove it. If it contains real passwords, change those passwords and remove the exposed records from the repository history.

---

## 📧 Support

For issues or questions:
- Check API response messages
- Review server console logs
- Test endpoints with cURL first
- Verify all environment variables are set

**Happy streaming! 🎌**
