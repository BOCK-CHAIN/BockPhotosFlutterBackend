import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { userModel } from '../models/userModel.js';

// Middleware to verify JWT access token
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        error: { 
          message: 'Access token required',
          statusCode: 401 
        } 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
    
    // Check if user still exists and is active
    const user = await userModel.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ 
        error: { 
          message: 'User not found or inactive',
          statusCode: 401 
        } 
      });
    }

    // Add user info to request object
    req.user = {
      id: user.id,
      email: user.email,
      isActive: user.is_active
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: { 
          message: 'Invalid token',
          statusCode: 401 
        } 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: { 
          message: 'Token expired',
          statusCode: 401 
        } 
      });
    }
    next(error);
  }
};

// Optional authentication middleware (doesn't fail if no token)
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
      const user = await userModel.findById(decoded.id);
      
      if (user && user.is_active) {
        req.user = {
          id: user.id,
          email: user.email,
          isActive: user.is_active
        };
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication if token is invalid
    next();
  }
};

// Role-based access control (for future use)
export const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: { 
          message: 'Authentication required',
          statusCode: 401 
        } 
      });
    }

    // Add role checking logic here when roles are implemented
    // if (req.user.role !== role) {
    //   return res.status(403).json({ 
    //     error: { 
    //       message: 'Insufficient permissions',
    //       statusCode: 403 
    //     } 
    //   });
    // }

    next();
  };
};
