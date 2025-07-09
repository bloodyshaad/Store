#!/bin/bash

# Grocery Store Management System - Deployment Script
# This script helps prepare the application for deployment

echo "🚀 Preparing Grocery Store Management System for deployment..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root directory."
    exit 1
fi

# Check if vercel.json exists
if [ ! -f "vercel.json" ]; then
    echo "❌ Error: vercel.json not found. Please ensure the configuration file exists."
    exit 1
fi

echo "✅ Project structure validated"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Error: Failed to install dependencies"
        exit 1
    fi
    echo "✅ Dependencies installed successfully"
else
    echo "✅ Dependencies already installed"
fi

# Run basic validation
echo "🔍 Running basic validation..."

# Check if server.js exists
if [ ! -f "server.js" ]; then
    echo "❌ Error: server.js not found"
    exit 1
fi

# Check if public directory exists
if [ ! -d "public" ]; then
    echo "❌ Error: public directory not found"
    exit 1
fi

# Check for required public files
required_files=("index.html" "login.html" "signup.html" "admin.html" "admin-login.html")
for file in "${required_files[@]}"; do
    if [ ! -f "public/$file" ]; then
        echo "❌ Error: Required file public/$file not found"
        exit 1
    fi
done

echo "✅ All required files present"

# Check package.json for required dependencies
echo "🔍 Checking dependencies..."
required_deps=("express" "sqlite3" "bcrypt" "jsonwebtoken" "cors" "body-parser" "uuid")
for dep in "${required_deps[@]}"; do
    if ! npm list "$dep" > /dev/null 2>&1; then
        echo "❌ Error: Required dependency '$dep' not found"
        exit 1
    fi
done

echo "✅ All required dependencies present"

# Clean up any temporary files
echo "🧹 Cleaning up temporary files..."
find . -name "*.tmp" -delete 2>/dev/null || true
find . -name "*.log" -delete 2>/dev/null || true
find . -name ".DS_Store" -delete 2>/dev/null || true

echo "✅ Cleanup completed"

# Display deployment information
echo ""
echo "🎉 Deployment preparation completed successfully!"
echo ""
echo "📋 Deployment Summary:"
echo "   • Project: Grocery Store Management System"
echo "   • Runtime: Node.js"
echo "   • Framework: Express.js"
echo "   • Database: SQLite (local development)"
echo "   • Frontend: Vanilla HTML/CSS/JavaScript"
echo ""
echo "🚀 Ready for deployment to Vercel!"
echo ""
echo "💡 Next steps:"
echo "   1. Ensure you have the Vercel CLI installed: npm i -g vercel"
echo "   2. Run 'vercel' to deploy to Vercel"
echo "   3. Configure environment variables in Vercel dashboard if needed"
echo ""
echo "⚠️  Important notes:"
echo "   • SQLite database will not persist on Vercel (serverless)"
echo "   • Consider using a cloud database for production"
echo "   • Admin credentials: Username: Admin, Password: 8888"
echo ""