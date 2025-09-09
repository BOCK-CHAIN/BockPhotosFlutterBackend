#!/bin/bash

# Hynorvixx Backend Deployment Script for EC2
# This script automates the deployment process on your EC2 instance

set -e  # Exit on any error

echo "🚀 Starting Hynorvixx Backend deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root"
   exit 1
fi

# Update system packages
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js and npm (if not already installed)
if ! command -v node &> /dev/null; then
    print_status "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    print_status "Node.js is already installed: $(node --version)"
fi

# Install PM2 globally
if ! command -v pm2 &> /dev/null; then
    print_status "Installing PM2..."
    sudo npm install -g pm2
else
    print_status "PM2 is already installed: $(pm2 --version)"
fi

# Install Nginx (if not already installed)
if ! command -v nginx &> /dev/null; then
    print_status "Installing Nginx..."
    sudo apt install -y nginx
    sudo systemctl enable nginx
    sudo systemctl start nginx
else
    print_status "Nginx is already installed: $(nginx -v)"
fi

# Create logs directory
print_status "Creating logs directory..."
mkdir -p logs

# Install dependencies
print_status "Installing Node.js dependencies..."
npm install --production

# Set proper permissions
print_status "Setting proper permissions..."
chmod +x deploy.sh
chmod 600 .env

# Copy Nginx configuration
print_status "Configuring Nginx..."
sudo cp nginx.conf /etc/nginx/sites-available/hynorvixx-backend
sudo ln -sf /etc/nginx/sites-available/hynorvixx-backend /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
print_status "Testing Nginx configuration..."
sudo nginx -t

# Reload Nginx
print_status "Reloading Nginx..."
sudo systemctl reload nginx

# Start application with PM2
print_status "Starting application with PM2..."
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
print_status "Saving PM2 configuration..."
pm2 save

# Setup PM2 startup script
print_status "Setting up PM2 startup script..."
pm2 startup

print_status "Deployment completed successfully! 🎉"
echo ""
echo "📋 Next steps:"
echo "1. Update your domain in nginx.conf"
echo "2. Configure SSL certificates (Let's Encrypt recommended)"
echo "3. Update your .env file with production values"
echo "4. Configure your database connection"
echo ""
echo "🔧 Useful commands:"
echo "  pm2 status                    - Check application status"
echo "  pm2 logs hynorvixx-backend   - View application logs"
echo "  pm2 restart hynorvixx-backend - Restart application"
echo "  sudo systemctl status nginx  - Check Nginx status"
echo ""
echo "🌐 Your application should now be running on port 3000"
echo "📱 API available at: https://hynorvixx.com/api"
