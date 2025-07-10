# 🛒 Grocery Store Management System

A comprehensive web-based grocery store management system built with Node.js, Express, and SQLite. This application provides complete point-of-sale functionality, inventory management, customer tracking, and business analytics.

## ✨ Features

### 🏪 Store Management
- Multi-tenant architecture supporting multiple stores
- Store owner registration and authentication
- Store-specific inventory and customer management
- Country and currency support

### 📦 Inventory Management
- Add, edit, and delete products
- Barcode support
- Stock tracking with automatic updates
- Category organization
- Cost and pricing management

### 👥 Customer Management
- Customer registration and profiles
- Credit limit management
- Transaction history tracking
- Contact information management

### 💳 Point of Sale (POS)
- Fast checkout process
- Cash and credit payment options
- Receipt generation
- Real-time inventory updates

### 💰 Credit Management
- Credit sales tracking
- Due date management
- Overdue payment alerts
- Payment recording and history

### 📊 Analytics & Reporting
- Daily income reports
- Profit/loss analysis
- Sales trends
- Customer analytics
- Inventory reports

### 🔐 Admin Panel
- System-wide administration
- Multi-store overview
- User management
- System analytics

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd grocery-store-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the application**
   ```bash
   npm start
   ```

4. **Access the application**
   - Open your browser and navigate to `http://localhost:3000`
   - Create a new store account or use admin access

### Admin Access
- **Username:** Admin
- **Password:** 8888
- **Admin Panel:** `/admin-login`

## 📁 Project Structure

```
grocery-store-app/
├── public/                 # Frontend files
│   ├── index.html         # Main application
│   ├── login.html         # User login
│   ├── signup.html        # Store registration
│   ├── admin.html         # Admin dashboard
│   ├── admin-login.html   # Admin login
│   ├── privacy.html       # Privacy policy
│   ├── terms.html         # Terms of service
│   ├── styles.css         # Main styles
│   ├── script.js          # Main application logic
│   ├── auth.js            # Authentication logic
│   ├── admin.js           # Admin panel logic
│   └── countries-currencies.js # Country/currency data
├── server.js              # Express server and API
├── package.json           # Dependencies and scripts
├── vercel.json           # Vercel deployment configuration
├── .vercelignore         # Files to exclude from deployment
└── deploy.sh             # Deployment preparation script
```

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new store
- `POST /api/auth/login` - Store owner login
- `POST /api/admin/login` - Admin login

### Store Management
- `GET /api/store` - Get store information
- `GET /api/items` - Get store inventory
- `POST /api/items` - Add new item
- `PUT /api/items/:id` - Update item
- `GET /api/customers` - Get customers
- `POST /api/customers` - Add customer

### Transactions
- `POST /api/transactions` - Create transaction
- `GET /api/transactions` - Get transaction history
- `GET /api/transactions/:id` - Get transaction details

### Credit Management
- `GET /api/credits/pending` - Get pending credits
- `GET /api/credits/overdue` - Get overdue credits
- `POST /api/credits/mark-paid` - Mark credit as paid

### Analytics
- `GET /api/analytics/income` - Get income analytics
- `GET /api/analytics/profit` - Get profit analytics

### Admin (Requires admin authentication)
- `GET /api/admin/stats` - System statistics
- `GET /api/admin/stores` - All stores
- `GET /api/admin/customers` - All customers
- `GET /api/admin/transactions` - All transactions

## 🚀 Deployment

### Vercel Deployment

1. **Prepare for deployment**
   ```bash
   ./deploy.sh
   ```

2. **Deploy to Vercel**
   ```bash
   npm i -g vercel  # Install Vercel CLI if not already installed
   vercel           # Deploy to Vercel
   ```

### Configuration

The application is configured for Vercel deployment with:
- Optimized caching for static assets
- Proper security headers
- CORS configuration for API endpoints
- Memory and timeout optimizations

### Environment Variables

For production deployment, consider setting:
- `JWT_SECRET` - Secret key for JWT tokens
- `NODE_ENV` - Set to "production"

## 🔧 Development

### Running in Development Mode
```bash
npm run dev  # Uses nodemon for auto-restart
```

### Database

The application uses **Supabase** (PostgreSQL) for data storage:
- Cloud-hosted PostgreSQL database
- Automatic scaling and backups
- Multi-tenant data isolation with Row Level Security (RLS)
- Real-time capabilities
- Built-in authentication and authorization

**Production Ready:** Supabase provides enterprise-grade PostgreSQL with automatic scaling, making it perfect for production deployments.

## 🛡️ Security Features

- JWT-based authentication
- Password hashing with bcrypt
- SQL injection prevention
- XSS protection headers
- CSRF protection
- Input validation and sanitization

## 📱 Mobile Support

The application is fully responsive and optimized for:
- Desktop browsers
- Tablet devices
- Mobile phones
- Touch interfaces

## 🌍 Internationalization

- Multi-currency support
- Country selection
- Currency symbol display
- Localized number formatting

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Check the documentation
- Review the API endpoints
- Use the admin panel for system management
- Contact through the application's support channels

## 🔄 Version History

- **v1.0.0** - Initial release with core functionality
- Multi-store support
- Complete POS system
- Admin panel
- Analytics and reporting

---

**Built with ❤️ for grocery store owners worldwide**