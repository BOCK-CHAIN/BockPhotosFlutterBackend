CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table for authentication
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP WITH TIME ZONE
);

-- Refresh tokens table for JWT refresh functionality
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMP WITH TIME ZONE
);

-- User sessions table for tracking active sessions
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_session_token ON user_sessions(session_token);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to clean up expired refresh tokens
CREATE OR REPLACE FUNCTION cleanup_expired_refresh_tokens()
RETURNS void AS $$
BEGIN
    DELETE FROM refresh_tokens WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Create function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM user_sessions WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Create function to get user by email
CREATE OR REPLACE FUNCTION get_user_by_email(user_email VARCHAR)
RETURNS TABLE(
    id UUID,
    email VARCHAR(255),
    password_hash VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN,
    last_login TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT u.id, u.email, u.password_hash, u.created_at, u.updated_at, u.is_active, u.last_login
    FROM users u
    WHERE u.email = user_email AND u.is_active = TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create function to update last login
CREATE OR REPLACE FUNCTION update_last_login(user_uuid UUID)
RETURNS void AS $$
BEGIN
    UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = user_uuid;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions for RDS setup
-- These permissions should be granted to your application user
-- Replace 'your_app_user' with your actual application database user
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;

-- RDS-specific optimizations
-- Enable query statistics collection
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Create function to get database statistics
CREATE OR REPLACE FUNCTION get_db_stats()
RETURNS TABLE(
    total_connections INTEGER,
    active_connections INTEGER,
    database_size TEXT,
    uptime INTERVAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT setting::INTEGER FROM pg_settings WHERE name = 'max_connections') as total_connections,
        (SELECT count(*)::INTEGER FROM pg_stat_activity WHERE state = 'active') as active_connections,
        pg_size_pretty(pg_database_size(current_database())) as database_size,
        (SELECT now() - pg_postmaster_start_time()) as uptime;
END;
$$ LANGUAGE plpgsql;

-- Create function to monitor slow queries
CREATE OR REPLACE FUNCTION get_slow_queries()
RETURNS TABLE(
    query TEXT,
    calls BIGINT,
    total_time DOUBLE PRECISION,
    mean_time DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        query,
        calls,
        total_time,
        mean_time
    FROM pg_stat_statements 
    WHERE mean_time > 1000  -- Queries taking more than 1 second on average
    ORDER BY mean_time DESC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql;
