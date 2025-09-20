# AWS RDS Setup Guide for Hynorvixx Backend

This guide will help you set up AWS RDS PostgreSQL for your Hynorvixx backend application.

## Prerequisites

- AWS Account with appropriate permissions
- EC2 instance running your application
- Basic knowledge of AWS services

## Step 1: Create RDS PostgreSQL Instance

### 1.1 Navigate to RDS Console
1. Go to AWS Console → RDS
2. Click "Create database"

### 1.2 Database Configuration
- **Engine type**: PostgreSQL
- **Version**: PostgreSQL 15.x (recommended)
- **Templates**: 
  - **Production**: db.t3.micro (for small production workloads)
  - **Development**: db.t3.micro (free tier eligible)

### 1.3 Settings
- **DB instance identifier**: `hynorvixx-db` (or your preferred name)
- **Master username**: `hynorvixx_admin` (or your preferred username)
- **Master password**: Generate a strong password (save it securely!)

### 1.4 Instance Configuration
- **DB instance class**: db.t3.micro (free tier) or db.t3.small (production)
- **Storage type**: General Purpose SSD (gp2)
- **Allocated storage**: 20 GB (minimum)
- **Storage autoscaling**: Enable (recommended)

### 1.5 Connectivity
- **VPC**: Same VPC as your EC2 instance
- **Subnet group**: Default (or create custom)
- **Public access**: No (for security)
- **VPC security groups**: Create new or use existing
- **Database port**: 5432 (default PostgreSQL port)

### 1.6 Additional Configuration
- **Initial database name**: `hynorvixx_prod` (or your preferred name)
- **Backup retention**: 7 days (production) or 1 day (development)
- **Backup window**: Choose appropriate time
- **Maintenance window**: Choose appropriate time
- **Enable encryption**: Yes (recommended)

## Step 2: Configure Security Groups

### 2.1 Create Security Group for RDS
1. Go to EC2 → Security Groups
2. Create new security group:
   - **Name**: `hynorvixx-rds-sg`
   - **Description**: Security group for RDS PostgreSQL
   - **VPC**: Same as your EC2 instance

### 2.2 Add Inbound Rules
- **Type**: PostgreSQL
- **Port**: 5432
- **Source**: 
  - Your EC2 security group (recommended)
  - Or your EC2 private IP/32
  - Or your VPC CIDR block

### 2.3 Apply to RDS Instance
1. Go to RDS → Databases
2. Select your database instance
3. Modify → Connectivity → Security groups
4. Add the security group you created

## Step 3: Database Setup

### 3.1 Connect to RDS Instance
```bash
# Install PostgreSQL client (if not already installed)
sudo apt update
sudo apt install postgresql-client

# Connect to your RDS instance
psql -h your-rds-endpoint.region.rds.amazonaws.com -U hynorvixx_admin -d hynorvixx_prod
```

### 3.2 Create Application User
```sql
-- Create application user
CREATE USER hynorvixx_app WITH PASSWORD 'your_secure_app_password';

-- Grant necessary permissions
GRANT CONNECT ON DATABASE hynorvixx_prod TO hynorvixx_app;
GRANT USAGE ON SCHEMA public TO hynorvixx_app;
GRANT CREATE ON SCHEMA public TO hynorvixx_app;

-- Grant table permissions (will be applied after schema creation)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO hynorvixx_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO hynorvixx_app;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO hynorvixx_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO hynorvixx_app;
```

### 3.3 Run Database Schema
```bash
# Run the schema file
psql -h your-rds-endpoint.region.rds.amazonaws.com -U hynorvixx_admin -d hynorvixx_prod -f database_schema.sql
```

## Step 4: Update Application Configuration

### 4.1 Update Environment Variables
Update your `.env` file with RDS connection details:

```bash
# Database configuration
DATABASE_URL=postgresql://hynorvixx_app:your_secure_app_password@your-rds-endpoint.region.rds.amazonaws.com:5432/hynorvixx_prod?sslmode=require

# RDS-specific configuration
DB_POOL_SIZE=30
DB_CONNECTION_TIMEOUT=15000
DB_IDLE_TIMEOUT=60000
```

### 4.2 Test Connection
```bash
# Test database connection
node test-db-connection.js
```

## Step 5: Performance Optimization

### 5.1 RDS Parameter Groups (Optional)
1. Go to RDS → Parameter groups
2. Create new parameter group for PostgreSQL
3. Modify parameters for better performance:
   - `shared_preload_libraries`: `pg_stat_statements`
   - `log_statement`: `all` (for debugging)
   - `log_min_duration_statement`: `1000` (log slow queries)

### 5.2 Monitoring
- Enable CloudWatch monitoring
- Set up RDS performance insights
- Monitor connection count and query performance

## Step 6: Backup and Recovery

### 6.1 Automated Backups
- RDS automatically creates daily backups
- Point-in-time recovery is available
- Backup retention period: 7 days (configurable)

### 6.2 Manual Snapshots
```bash
# Create manual snapshot via AWS CLI
aws rds create-db-snapshot \
    --db-instance-identifier hynorvixx-db \
    --db-snapshot-identifier hynorvixx-backup-$(date +%Y%m%d)
```

## Security Best Practices

1. **Network Security**:
   - Use private subnets for RDS
   - Restrict security group access
   - Use VPC endpoints if needed

2. **Access Control**:
   - Use IAM database authentication (optional)
   - Rotate passwords regularly
   - Use least privilege principle

3. **Encryption**:
   - Enable encryption at rest
   - Use SSL/TLS for connections
   - Store secrets in AWS Secrets Manager

4. **Monitoring**:
   - Enable CloudTrail for API calls
   - Set up CloudWatch alarms
   - Monitor failed login attempts

## Troubleshooting

### Common Issues

1. **Connection Refused**:
   - Check security groups
   - Verify RDS instance is running
   - Check VPC configuration

2. **Authentication Failed**:
   - Verify username/password
   - Check user permissions
   - Ensure user exists in database

3. **SSL Issues**:
   - Add `?sslmode=require` to connection string
   - Check SSL certificate validity

4. **Performance Issues**:
   - Monitor CloudWatch metrics
   - Check connection pool settings
   - Optimize queries

### Useful Commands

```bash
# Check RDS instance status
aws rds describe-db-instances --db-instance-identifier hynorvixx-db

# Test connection from EC2
telnet your-rds-endpoint.region.rds.amazonaws.com 5432

# Check security groups
aws ec2 describe-security-groups --group-ids sg-xxxxxxxxx
```

## Cost Optimization

1. **Instance Sizing**:
   - Start with db.t3.micro (free tier)
   - Monitor usage and scale as needed
   - Use reserved instances for production

2. **Storage**:
   - Use General Purpose SSD (gp2)
   - Enable storage autoscaling
   - Monitor storage usage

3. **Backup**:
   - Adjust backup retention period
   - Delete old manual snapshots
   - Use automated backups efficiently

## Next Steps

1. Set up monitoring and alerting
2. Configure automated backups
3. Implement connection pooling
4. Set up read replicas if needed
5. Plan for disaster recovery

For more information, refer to the [AWS RDS Documentation](https://docs.aws.amazon.com/rds/).
