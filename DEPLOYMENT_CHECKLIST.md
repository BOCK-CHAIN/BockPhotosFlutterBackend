# 🚀 EC2 Deployment Checklist

## Pre-Deployment Checklist

### ✅ AWS Setup
- [ ] EC2 instance launched (Ubuntu 20.04+)
- [ ] Security groups configured (ports 22, 80, 443)
- [ ] Key pair downloaded and accessible
- [ ] Elastic IP assigned (if needed)
- [ ] RDS instance created (if using managed database)

### ✅ Domain & SSL
- [ ] Domain name purchased/configured
- [ ] DNS records pointing to EC2 public IP
- [ ] SSL certificate ready (Let's Encrypt recommended)

### ✅ Database
- [ ] PostgreSQL database accessible from EC2
- [ ] Database user created with proper permissions
- [ ] Database schema ready (`database_schema.sql`)
- [ ] Connection string formatted correctly

### ✅ AWS Services
- [ ] S3 bucket created for photo uploads
- [ ] IAM user created with S3 permissions
- [ ] Access keys generated and secure

## Deployment Steps

### 1. 🖥️ Connect to EC2
```bash
ssh -i your-key.pem ubuntu@your-ec2-public-ip
```

### 2. 📁 Upload Code
```bash
# Option A: Git clone
sudo apt install git -y
git clone https://github.com/yourusername/hynorvixx_backend.git
cd hynorvixx_backend

# Option B: SCP upload
# (run from your local machine)
scp -i your-key.pem -r ./hynorvixx_backend ubuntu@your-ec2-public-ip:~/
```

### 3. ⚙️ Configure Environment
```bash
# Copy production template
cp env-production.txt .env

# Edit with your values
nano .env
```

**Required Variables:**
- [ ] `NODE_ENV=production`
- [ ] `DATABASE_URL` (your production database)
- [ ] `JWT_ACCESS_SECRET` (64-char random string)
- [ ] `JWT_REFRESH_SECRET` (64-char random string)
- [ ] `CORS_ORIGIN` (your frontend domain)
- [ ] `AWS_ACCESS_KEY_ID`
- [ ] `AWS_SECRET_ACCESS_KEY`
- [ ] `AWS_REGION`
- [ ] `S3_BUCKET`

### 4. 🚀 Run Deployment
```bash
# Make script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

### 5. 🌐 Configure Domain
```bash
# Edit Nginx config
sudo nano /etc/nginx/sites-available/hynorvixx-backend

# Replace 'your-domain.com' with actual domain (use 'hynorvixx.com')
# Save and exit (Ctrl+X, Y, Enter)

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### 6. 🔒 Setup SSL (Optional)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d hynorvixx.com -d www.hynorvixx.com

# Test auto-renewal
sudo certbot renew --dry-run
```

### 7. 🗄️ Database Setup
```bash
# Connect to your database
psql -h your-db-host -U your-user -d your-database

# Run schema (if you have one)
\i database_schema.sql

# Exit
\q
```

## Post-Deployment Verification

### ✅ Application Status
- [ ] PM2 shows application running: `pm2 status`
- [ ] Application logs are clean: `pm2 logs hynorvixx-backend`
- [ ] Health check responds: `curl https://hynorvixx.com/health`
- [ ] API responds: `curl https://hynorvixx.com/api`

### ✅ Nginx Status
- [ ] Nginx is running: `sudo systemctl status nginx`
- [ ] Configuration is valid: `sudo nginx -t`
- [ ] Ports are listening: `sudo netstat -tlnp | grep :80`

### ✅ Security
- [ ] Firewall enabled: `sudo ufw status`
- [ ] Only necessary ports open (22, 80, 443)
- [ ] Environment file permissions: `ls -la .env` (should be 600)

### ✅ Monitoring
- [ ] PM2 startup configured: `pm2 startup`
- [ ] PM2 configuration saved: `pm2 save`
- [ ] Logs directory created: `ls -la logs/`

## Troubleshooting Commands

### 🔍 Check Application
```bash
# PM2 status
pm2 status

# Application logs
pm2 logs hynorvixx-backend

# Environment variables
pm2 env hynorvixx-backend

# Restart if needed
pm2 restart hynorvixx-backend
```

### 🔍 Check Nginx
```bash
# Status
sudo systemctl status nginx

# Configuration test
sudo nginx -t

# Error logs
sudo tail -f /var/log/nginx/error.log

# Access logs
sudo tail -f /var/log/nginx/access.log
```

### 🔍 Check System
```bash
# Port usage
sudo netstat -tlnp | grep :3000
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :443

# Process status
ps aux | grep node
ps aux | grep nginx

# System resources
htop
df -h
free -h
```

### 🔍 Check Database
```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1;"

# Check tables
psql $DATABASE_URL -c "\dt"
```

## Security Checklist

### 🔒 Firewall
- [ ] UFW enabled: `sudo ufw status`
- [ ] Only SSH, HTTP, HTTPS allowed
- [ ] Default deny policy active

### 🔒 File Permissions
- [ ] `.env` file: 600 (owner read/write only)
- [ ] `deploy.sh`: 755 (executable)
- [ ] Application files: 644 (readable)

### 🔒 Environment Variables
- [ ] No secrets in code
- [ ] Strong JWT secrets (64+ characters)
- [ ] Production database credentials
- [ ] AWS credentials secure

### 🔒 SSL/TLS
- [ ] HTTPS redirect active
- [ ] SSL certificate valid
- [ ] Security headers configured
- [ ] HSTS enabled

## Performance Checklist

### ⚡ Optimization
- [ ] Gzip compression enabled
- [ ] Static file caching configured
- [ ] Rate limiting active
- [ ] PM2 cluster mode enabled

### 📊 Monitoring
- [ ] Application logs accessible
- [ ] Error tracking configured
- [ ] Performance metrics available
- [ ] Health checks responding

## Backup & Recovery

### 💾 Backup Strategy
- [ ] Database backup script
- [ ] Application code backup
- [ ] Environment config backup
- [ ] SSL certificates backup

### 🔄 Recovery Plan
- [ ] Database restore procedure
- [ ] Application rollback process
- [ ] SSL certificate renewal
- [ ] Emergency contact list

## Maintenance

### 🧹 Regular Tasks
- [ ] System updates: `sudo apt update && sudo apt upgrade`
- [ ] Dependency updates: `npm update`
- [ ] Log rotation and cleanup
- [ ] SSL certificate renewal

### 📈 Scaling Considerations
- [ ] Load balancer setup
- [ ] Auto-scaling configuration
- [ ] Database read replicas
- [ ] CDN for static assets

---

## 🎯 Success Criteria

Your deployment is successful when:
1. ✅ Application responds on `https://hynorvixx.com/health`
2. ✅ API endpoints work on `https://hynorvixx.com/api`
3. ✅ Database connections are stable
4. ✅ SSL certificate is valid and working
5. ✅ PM2 process is running and auto-starting
6. ✅ Nginx is serving traffic correctly
7. ✅ Logs are being generated and accessible
8. ✅ Security measures are in place

## 🆘 Emergency Contacts

- **AWS Support**: If you have support plan
- **Domain Registrar**: For DNS issues
- **Database Provider**: For connection issues
- **SSL Provider**: For certificate issues

---

**Remember**: Always test in a staging environment first, and keep backups of everything!
