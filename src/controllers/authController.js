import bcrypt from 'bcryptjs';
import { userModel } from '../models/userModel.js';
import { generateTokens } from '../utils/jwt.js';
import jwt from 'jsonwebtoken';

export const signup = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    // Check if user already exists
    const existingUser = await userModel.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const user = await userModel.createUser(email, hashedPassword);
    
    // Generate tokens
    const tokens = generateTokens({ id: user.id });
    
    res.status(201).json({ 
      user: { id: user.id, email: user.email, created_at: user.created_at }, 
      ...tokens 
    });
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    // Find user by email
    const user = await userModel.findByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Update last login
    await userModel.updateLastLogin(user.id);
    
    // Generate tokens
    const tokens = generateTokens({ id: user.id });
    
    res.json({ 
      user: { 
        id: user.id, 
        email: user.email, 
        created_at: user.created_at,
        last_login: user.last_login 
      }, 
      ...tokens 
    });
  } catch (err) {
    next(err);
  }
};

export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token is required' });
    }
    
    // Verify refresh token and generate new access token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const newTokens = generateTokens({ id: decoded.id });
    
    res.json(newTokens);
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Refresh token expired' });
    }
    next(err);
  }
};

export const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (refreshToken) {
      // In a more complete implementation, you would:
      // 1. Add the refresh token to a blacklist
      // 2. Or delete it from the refresh_tokens table
      // 3. Or mark it as revoked
      
      // For now, we'll just return success
      // The frontend should discard the tokens
    }
    
    res.json({ message: 'Logout successful' });
  } catch (err) {
    next(err);
  }
};
