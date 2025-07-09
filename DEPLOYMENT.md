# 🚀 Deployment Guide - Grocery Store Management System

## Vercel Deployment

This application is configured for easy deployment on Vercel with the included `vercel.json` configuration.

### 📋 Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Git Repository**: Push your code to GitHub, GitLab, or Bitbucket
3. **Node.js**: Ensure your local environment has Node.js 18+ (Vercel supports Node.js 18.x)

### 🔧 Environment Variables

Before deploying, set up these environment variables in your Vercel dashboard:

```bash
# Required Environment Variables
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
NODE_ENV=production
PORT=3000

# Optional (with defaults)
ADMIN_USERNAME=Admin
ADMIN_PASSWORD=8888
```

### 📁 Database Considerations

**⚠️ Important**: SQLite doesn't work well with serverless deployments like Vercel because:
- File system is read-only
- No persistent storage between function invocations
- Database resets on each deployment

**Recommended Database Solutions:**

1. **Vercel Postgres** (Recommended)
   ```bash
   # Add to your Vercel project
   vercel postgres create
   ```

2. **PlanetScale** (MySQL-compatible)
   - Free tier available
   - Serverless MySQL platform
   - Easy integration

3. **Railway PostgreSQL**
   - Simple setup
   - Good free tier

4. **MongoDB Atlas**
   - Document database
   - Generous free tier

### 🚀 Deployment Steps

#### Method 1: Vercel CLI (Recommended)

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel
   ```

4. **Set Environment Variables**:
   ```bash
   vercel env add JWT_SECRET
   vercel env add NODE_ENV
   ```

#### Method 2: Vercel Dashboard

1. **Connect Repository**:
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your Git repository

2. **Configure Build Settings**:
   - Framework Preset: `Other`
   - Build Command: `echo "No build required"`
   - Output Directory: `public`
   - Install Command: `npm install`

3. **Add Environment Variables**:
   - Go to Project Settings → Environment Variables
   - Add the required variables listed above

4. **Deploy**:
   - Click "Deploy"
   - Wait for deployment to complete

### 🔗 Application Routes

After deployment, your app will be available at:

- **Main App**: `https://your-app.vercel.app/`
- **Login**: `https://your-app.vercel.app/login`
- **Signup**: `https://your-app.vercel.app/signup`
- **Admin Panel**: `https://your-app.vercel.app/admin`
- **Admin Login**: `https://your-app.vercel.app/admin-login`

### 🛠️ API Endpoints

All API endpoints will be available under `/api/`:

- `POST /api/auth/login`
- `POST /api/auth/signup`
- `GET /api/items`
- `POST /api/transactions`
- `GET /api/admin/stats`
- And more...

### 🔒 Security Configuration

The `vercel.json` includes security headers:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- CORS configuration for API endpoints

### 🐛 Troubleshooting

#### Common Issues:

1. **Database Connection Errors**:
   - Ensure you're using a cloud database, not SQLite
   - Check environment variables are set correctly

2. **Function Timeout**:
   - Vercel functions have a 30-second timeout (configured in vercel.json)
   - Optimize database queries if needed

3. **Static File Issues**:
   - Ensure all static files are in the `public/` directory
   - Check file paths are correct

4. **Environment Variables**:
   - Verify all required env vars are set in Vercel dashboard
   - Redeploy after adding new environment variables

### 📊 Monitoring

- **Vercel Analytics**: Enable in project settings
- **Function Logs**: Available in Vercel dashboard
- **Performance**: Monitor in Vercel dashboard

### 🔄 Updates

To update your deployment:

1. **Push to Git**: Changes are automatically deployed
2. **Manual Deploy**: Use `vercel --prod` for production deployment
3. **Rollback**: Use Vercel dashboard to rollback to previous deployment

### 💡 Tips

1. **Custom Domain**: Add your domain in Vercel project settings
2. **Preview Deployments**: Every branch gets a preview URL
3. **Environment Branches**: Set different env vars for preview/production
4. **Function Regions**: Configured for `iad1` (US East) in vercel.json

---

## 🎉 Success!

Your Grocery Store Management System should now be live on Vercel! 

**Next Steps:**
1. Test all functionality
2. Set up your database
3. Configure admin credentials
4. Add your custom domain (optional)

For support, check the [Vercel documentation](https://vercel.com/docs) or create an issue in the repository.