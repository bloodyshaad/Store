# 🛒 Grocery Store Management System

A comprehensive, modern grocery store management system built with Node.js, Express, and SQLite. Features a beautiful admin panel, multi-store support, and complete POS functionality.

## ✨ Features

### 🏪 Store Management
- **Multi-store Support**: Manage multiple grocery stores from one system
- **Store Registration**: Easy store setup with country/currency selection
- **Owner Management**: Complete store owner profiles and authentication

### 📦 Inventory Management
- **Product Catalog**: Add, edit, and manage store inventory
- **Barcode Support**: Scan and manage products with barcodes
- **Stock Tracking**: Real-time inventory levels and alerts
- **Category Organization**: Organize products by categories

### 👥 Customer Management
- **Customer Profiles**: Maintain customer information and history
- **Credit Management**: Track customer credit and payment history
- **Transaction History**: Complete customer purchase records

### 💳 Point of Sale (POS)
- **Fast Checkout**: Quick and efficient transaction processing
- **Multiple Payment Types**: Cash and credit payment options
- **Receipt Generation**: Professional transaction receipts
- **Return Processing**: Handle product returns and refunds

### 📊 Analytics & Reporting
- **Sales Analytics**: Revenue tracking and profit analysis
- **Inventory Reports**: Stock levels and movement reports
- **Customer Analytics**: Customer behavior and purchase patterns
- **Financial Dashboard**: Complete financial overview

### 🔐 Admin Panel
- **System Overview**: Monitor all stores from central dashboard
- **User Management**: Manage store owners and access
- **System Analytics**: Cross-store performance metrics
- **Data Management**: Comprehensive data administration

### 🌍 Multi-Country Support
- **195+ Countries**: Support for stores worldwide
- **Currency Management**: Automatic currency selection by country
- **Localized Experience**: Country-specific store setup

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd grocery-store-app
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm start
   ```

4. **Access the application**:
   - Main App: http://localhost:3000
   - Admin Panel: http://localhost:3000/admin-login

### Default Admin Credentials
- **Username**: Admin
- **Password**: 8888

## 📱 Application Structure

```
grocery-store-app/
├── public/                 # Frontend files
│   ├── index.html         # Main POS interface
│   ├── login.html         # Store owner login
│   ├── signup.html        # Store registration
│   ├── admin.html         # Admin dashboard
│   ├── admin-login.html   # Admin login
│   ├── styles.css         # Main styles
│   ├── script.js          # POS functionality
│   ├── auth.js           # Authentication logic
│   └── admin.js          # Admin panel logic
├── server.js              # Express server
├── package.json           # Dependencies
├── vercel.json           # Vercel deployment config
└── README.md             # This file
```

## 🛠️ Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: SQLite (development), PostgreSQL (production)
- **Authentication**: JWT tokens, bcrypt
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Charts**: Chart.js for analytics
- **Deployment**: Vercel-ready configuration

## 🌐 Deployment

### Vercel (Recommended)

1. **Push to Git repository**
2. **Connect to Vercel**
3. **Set environment variables**:
   ```bash
   JWT_SECRET=your-secret-key
   NODE_ENV=production
   ```
4. **Deploy automatically**

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Secret (Change in production!)
JWT_SECRET=your-super-secret-jwt-key

# Admin Credentials
ADMIN_USERNAME=Admin
ADMIN_PASSWORD=8888
```

## 📖 API Documentation

### Authentication Endpoints
- `POST /api/auth/login` - Store owner login
- `POST /api/auth/signup` - Store registration

### Store Management
- `GET /api/items` - Get store inventory
- `POST /api/items` - Add new product
- `PUT /api/items/:id` - Update product

### Transaction Management
- `POST /api/transactions` - Create new transaction
- `GET /api/transactions` - Get transaction history

### Admin Endpoints
- `POST /api/admin/login` - Admin authentication
- `GET /api/admin/stats` - System statistics
- `GET /api/admin/stores` - All stores overview

## 🎨 Features Showcase

### Modern UI/UX
- **Glassmorphism Design**: Beautiful translucent interfaces
- **Responsive Layout**: Works on all devices
- **Dark Theme**: Easy on the eyes
- **Smooth Animations**: Polished user experience

### Advanced POS Features
- **Barcode Scanning**: Quick product lookup
- **Smart Search**: Intelligent product search
- **Quick Actions**: Fast checkout process
- **Receipt Printing**: Professional receipts

### Comprehensive Analytics
- **Real-time Charts**: Live data visualization
- **Profit Tracking**: Revenue and cost analysis
- **Inventory Insights**: Stock movement patterns
- **Customer Analytics**: Purchase behavior analysis

## 🔒 Security Features

- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: bcrypt encryption
- **Input Validation**: Comprehensive data validation
- **SQL Injection Protection**: Parameterized queries
- **XSS Protection**: Content security headers

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the [DEPLOYMENT.md](DEPLOYMENT.md) for deployment help
- Review the code documentation

## 🎯 Roadmap

- [ ] Mobile app (React Native)
- [ ] Advanced reporting
- [ ] Multi-language support
- [ ] Integration with payment gateways
- [ ] Inventory forecasting
- [ ] Supplier management
- [ ] Employee management
- [ ] Advanced analytics

---

**Built with ❤️ for grocery store owners worldwide**