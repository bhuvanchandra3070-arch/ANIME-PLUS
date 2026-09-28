# 🎌 CrunchyHub Backend - Complete Guide

## 🚀 Setup & Installation

### Prerequisites
- Node.js (v14+)
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
JWT_SECRET=your_very_long_random_secret_key_change_this_in_production
NODE_ENV=development
```

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
✅ **Error Handling** - Detailed error messages
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

## 🎯 Next Steps

1. **Set up MongoDB Atlas** - Get free 512MB database
2. **Add email verification** - Send confirmation links
3. **Implement password reset** - Forgot password flow
4. **Add social login** - Google, GitHub OAuth
5. **Rate limiting** - Prevent brute force attacks
6. **Admin dashboard** - Manage users & content

---

## 📧 Support

For issues or questions:
- Check API response messages
- Review server console logs
- Test endpoints with cURL first
- Verify all environment variables are set

**Happy streaming! 🎌**
