# Deploy to Render - Step by Step Guide

## 🚀 Deployment Instructions

### 1. **Prepare Your Repository**
```bash
# Ensure all changes are committed
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

### 2. **Create Render Account & Service**

1. Go to [render.com](https://render.com) and sign up/login
2. Click "New +" → "Web Service"
3. Connect your GitHub repository: `Bendifallah-Rami/GYM-back`

### 3. **Configure Web Service**

**Basic Settings:**
- **Name**: `gym-management-api`
- **Environment**: `Node`
- **Region**: Choose closest to your users
- **Branch**: `main`
- **Build Command**: `npm install`
- **Start Command**: `npm start`

### 4. **Set Environment Variables**

In Render dashboard, add these environment variables:

```env
# Required Environment Variables
NODE_ENV=production
PORT=10000
SESSION_SECRET=your-super-secret-session-key-change-this-in-production-render

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long-render

# Frontend URL (update with your frontend URL)
FRONTEND_URL=https://your-frontend-app.onrender.com

# Email Configuration (optional but recommended)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@yourgym.com

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://gym-management-api.onrender.com/api/auth/google/callback
```

### 5. **Create PostgreSQL Database**

1. In Render dashboard, click "New +" → "PostgreSQL"
2. **Name**: `gym-db`
3. **Database**: `gym_db`
4. **User**: `gym_user`
5. **Region**: Same as your web service
6. **Plan**: Free tier

### 6. **Connect Database to Web Service**

1. Go to your web service settings
2. Add environment variable:
   - **Key**: `DATABASE_URL`
   - **Value**: Select your PostgreSQL database from dropdown

### 7. **Deploy**

1. Click "Deploy" in your web service
2. Monitor the build logs
3. Wait for successful deployment

## 🔗 **Your API will be available at:**
```
https://gym-management-api.onrender.com
```

## 📋 **Test Endpoints:**

```bash
# Health check
curl https://gym-management-api.onrender.com/health

# API documentation
curl https://gym-management-api.onrender.com/api

# Register new user
curl -X POST https://gym-management-api.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'
```

## ⚠️ **Important Notes:**

1. **Free Tier Limitations:**
   - Service sleeps after 15 minutes of inactivity
   - 750 hours/month usage limit
   - Database limited to 1GB storage

2. **Database Migrations:**
   - Migrations run automatically on deployment
   - Check deployment logs for any migration errors

3. **Environment Variables:**
   - Never commit real secrets to git
   - Use strong, unique secrets for production
   - Update FRONTEND_URL when you deploy your frontend

4. **Monitoring:**
   - Use Render dashboard to monitor service health
   - Check logs for any runtime errors
   - Set up monitoring alerts (upgrade to paid plan)

## 🎯 **Next Steps:**

1. Deploy your frontend application
2. Update FRONTEND_URL in environment variables
3. Test all API endpoints
4. Set up monitoring and alerts
5. Configure custom domain (optional)

## 🆘 **Troubleshooting:**

- **Build fails**: Check Node.js version compatibility
- **Database errors**: Verify DATABASE_URL is set correctly
- **Service won't start**: Check environment variables
- **CORS errors**: Update FRONTEND_URL with correct domain

Your gym management API is now live! 🎉