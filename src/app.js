import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import authRoutes from './routes/authRoutes.js';
import photoRoutes from './routes/photoRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// CORS configuration
app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV 
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/photos', photoRoutes);

// API info endpoint (must come after specific API routes)
app.get('/api', (req, res) => {
  res.json({
    message: 'Hynorvixx Backend API',
    version: '1.0.0',
    endpoints: {
      auth: {
        base: '/api/auth',
        routes: [
          { method: 'POST', path: '/api/auth/signup', description: 'User registration' },
          { method: 'POST', path: '/api/auth/login', description: 'User login' },
          { method: 'POST', path: '/api/auth/refresh', description: 'Refresh access token' },
          { method: 'POST', path: '/api/auth/logout', description: 'User logout' }
        ]
      },
      photos: {
        base: '/api/photos',
        routes: [
          { method: 'POST', path: '/api/photos/upload-url', description: 'Get presigned URL for S3 upload' },
          { method: 'GET', path: '/api/photos', description: 'List user photos' },
          { method: 'GET', path: '/api/photos/:id', description: 'Get specific photo' },
          { method: 'PUT', path: '/api/photos/:id', description: 'Update photo metadata' },
          { method: 'DELETE', path: '/api/photos/:id', description: 'Delete photo' }
        ]
      }
    },
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handling middleware
app.use(errorHandler);

export default app;
