#!/bin/bash

# UBI Tech Support - Automated Deployment Script
# Usage: ./deploy.sh

# Stop on any error
set -e

echo "🚀 Starting Deployment..."

# 1. Pull latest code
echo "📥 Pulling from GitHub..."
git pull

# 2. Install Dependencies
echo "📦 Installing Dependencies..."
rm -rf node_modules package-lock.json
npm install

# 3. Build the Application
echo "hammer_and_wrench Building App..."
# Replace this with your actual API key or ensure it is set in the server environment
export API_KEY="AIzaSyBFWchmXp4FdZbN4ZPnXUUvcFdS50M7NgI"
npm run build

# 4. Deploy to Web Server
echo "🌍 Deploying to Nginx..."
# Clear old files
sudo rm -rf /var/www/html/*
# Copy new files
sudo cp -r dist/* /var/www/html/

# 5. Fix Permissions
echo "🔒 Fixing Permissions..."
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html

# 6. Restart Nginx
echo "🔄 Restarting Web Server..."
sudo systemctl restart nginx

echo "✅ Deployment Complete! Visit http://13.229.219.21"
