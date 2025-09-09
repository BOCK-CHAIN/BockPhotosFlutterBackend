# Hynorvixx Backend

A modern Node.js backend API for photo gallery management with JWT authentication, PostgreSQL database, and AWS S3 integration.

## 🚀 EC2 Deployment Guide

This guide will walk you through deploying your Hynorvixx Backend on AWS EC2.

### Prerequisites

- AWS EC2 instance (Ubuntu 20.04+ recommended)
- Domain name (optional but recommended)
- PostgreSQL database (RDS or external)
- AWS S3 bucket for photo uploads
- AWS IAM user with S3 permissions

### 🏗️ Architecture

```
Internet → Nginx (Port 80/443) → Node.js App (Port 3000) → PostgreSQL + S3
```

### 📋 Step-by-Step Deployment

#### 1. Launch EC2 Instance

1. **Launch Instance:**
   - AMI: Ubuntu Server 20.04 LTS or newer
   - Instance Type: t3.micro (free tier) or t3.small for production
   - Storage: 8GB minimum
   - Security Group: Allow ports 22 (SSH), 80 (HTTP), 443 (HTTPS)

2. **Security Group Configuration:**
   ```
   SSH (22): 0.0.0.0/0 (or your IP)
   HTTP (80): 0.0.0.0/0
   HTTPS (443): 0.0.0.0/0
   Custom TCP (3000): 0.0.0.0/0 (optional, for direct access)
   ```

#### 2. Connect to EC2 Instance

```bash
# Using SSH key
ssh -i your-key.pem ubuntu@your-ec2-public-ip

# Or using password (if configured)
ssh ubuntu@your-ec2-public-ip
```

#### 3. Upload Your Code

**Option A: Using Git (Recommended)**
```bash
# Install Git
sudo apt update
sudo apt install git -y

# Clone your repository
git clone https://github.com/yourusername/hynorvixx_backend.git
cd hynorvixx_backend
```

**Option B: Using SCP**
```bash
# From your local machine
scp -i your-key.pem -r ./hynorvixx_backend ubuntu@your-ec2-public-ip:~/
```

#### 4. Configure Environment Variables

```bash
# Copy production environment template
cp env-production.txt .env

# Edit the .env file with your production values
nano .env
```

**Required Environment Variables:**
```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:pass@your-db-host:5432/dbname
JWT_ACCESS_SECRET=your-64-char-secret
JWT_REFRESH_SECRET=your-64-char-secret
CORS_ORIGIN=https://your-frontend-domain.com
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_REGION=us-east-1
S3_BUCKET=your-photo-bucket
```

#### 5. Run Deployment Script

```bash
# Make deployment script executable
chmod +x deploy.sh

# Run the deployment script
./deploy.sh
```

The script will automatically:
- Update system packages
- Install Node.js 18.x
- Install PM2 process manager
- Install and configure Nginx
- Set up your application
- Configure PM2 startup

#### 6. Configure Domain and SSL (Optional)

1. **Update Nginx Configuration:**
   ```bash
   sudo nano /etc/nginx/sites-available/hynorvixx-backend
   ```
   Replace `your-domain.com` with your actual domain.

2. **Install SSL Certificate (Let's Encrypt):**
   ```bash
   sudo apt install certbot python3-certbot-nginx -y
   sudo certbot --nginx -d hynorvixx.com -d www.hynorvixx.com
   ```

3. **Reload Nginx:**
   ```bash
   sudo systemctl reload nginx
   ```

#### 7. Database Setup

1. **Create PostgreSQL Database:**
   ```sql
   CREATE DATABASE hynorvixx_prod;
   CREATE USER hynorvixx_user WITH PASSWORD 'secure_password';
   GRANT ALL PRIVILEGES ON DATABASE hynorvixx_prod TO hynorvixx_user;
   ```

2. **Run Database Schema:**
   ```bash
   # If you have a schema file
   psql -h your-db-host -U hynorvixx_user -d hynorvixx_prod -f database_schema.sql
   ```

### 🔧 Management Commands

#### PM2 Process Management
```bash
# Check status
pm2 status

# View logs
pm2 logs hynorvixx-backend

# Restart application
pm2 restart hynorvixx-backend

# Stop application
pm2 stop hynorvixx-backend

# Start application
pm2 start hynorvixx-backend
```

#### Nginx Management
```bash
# Check status
sudo systemctl status nginx

# Reload configuration
sudo systemctl reload nginx

# Restart Nginx
sudo systemctl restart nginx

# Test configuration
sudo nginx -t
```

#### Application Logs
```bash
# PM2 logs
pm2 logs hynorvixx-backend

# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log

# System logs
sudo journalctl -u nginx -f
```

### 📊 Monitoring and Health Checks

Your application includes built-in health checks:
- **Health Endpoint:** `https://hynorvixx.com/health`
- **API Status:** `https://hynorvixx.com/api`

### 🔒 Security Considerations

1. **Firewall Configuration:**
   ```bash
   # Allow only necessary ports
   sudo ufw allow 22/tcp
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   ```

2. **Regular Updates:**
   ```bash
   # Update system packages
   sudo apt update && sudo apt upgrade -y
   
   # Update Node.js dependencies
   npm update
   ```

3. **Backup Strategy:**
   - Database backups
   - Application code backups
   - Environment configuration backups

### 🚨 Troubleshooting

#### Common Issues

1. **Application Not Starting:**
   ```bash
   # Check PM2 logs
   pm2 logs hynorvixx-backend
   
   # Check environment variables
   pm2 env hynorvixx-backend
   ```

2. **Nginx Not Working:**
   ```bash
   # Check Nginx status
   sudo systemctl status nginx
   
   # Check configuration
   sudo nginx -t
   
   # Check error logs
   sudo tail -f /var/log/nginx/error.log
   ```

3. **Database Connection Issues:**
   - Verify DATABASE_URL in .env
   - Check security group rules
   - Verify database credentials

4. **Port Already in Use:**
   ```bash
   # Check what's using port 3000
   sudo netstat -tlnp | grep :3000
   
   # Kill process if needed
   sudo kill -9 <PID>
   ```

### 📈 Scaling Considerations

1. **Load Balancer:** Use AWS ALB for multiple EC2 instances
2. **Auto Scaling:** Configure Auto Scaling Groups
3. **Database:** Use RDS with read replicas
4. **Caching:** Implement Redis for session storage
5. **CDN:** Use CloudFront for static assets

### 🔄 Deployment Updates

To update your application:

```bash
# Pull latest code
git pull origin main

# Install new dependencies
npm install --production

# Restart application
pm2 restart hynorvixx-backend

# Check status
pm2 status
```

### 📞 Support

If you encounter issues:
1. Check the logs: `pm2 logs hynorvixx-backend`
2. Verify environment variables
3. Check Nginx configuration
4. Ensure all services are running

---

## 🎯 Quick Start (Development)

```bash
# Install dependencies
npm install

# Copy environment template
cp env-template.txt .env

# Edit .env with your values
nano .env

# Start development server
npm run dev
```

## 📚 API Documentation

- **Health Check:** `GET /health`
- **Authentication:** `POST /api/auth/signup`, `POST /api/auth/login`
- **Photos:** `GET /api/photos`, `POST /api/photos/upload-url`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License.
