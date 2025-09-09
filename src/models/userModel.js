import { pool } from '../config/db.js';

export const userModel = {
  // Create a new user
  async createUser(email, passwordHash) {
    const query = `
      INSERT INTO users (email, password_hash) 
      VALUES ($1, $2) 
      RETURNING id, email, created_at, is_active
    `;
    const result = await pool.query(query, [email, passwordHash]);
    return result.rows[0];
  },

  // Find user by email
  async findByEmail(email) {
    const query = `
      SELECT * FROM users 
      WHERE email = $1 AND is_active = TRUE
    `;
    const result = await pool.query(query, [email]);
    return result.rows[0] || null;
  },

  // Find user by ID
  async findById(id) {
    const query = `
      SELECT id, email, created_at, updated_at, is_active, last_login 
      FROM users 
      WHERE id = $1 AND is_active = TRUE
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  },

  // Update last login time
  async updateLastLogin(userId) {
    const query = `
      UPDATE users 
      SET last_login = CURRENT_TIMESTAMP 
      WHERE id = $1
    `;
    await pool.query(query, [userId]);
  },

  // Update user profile
  async updateUser(userId, updates) {
    const allowedFields = ['email'];
    const fields = Object.keys(updates).filter(key => allowedFields.includes(key));
    
    if (fields.length === 0) return null;
    
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const query = `
      UPDATE users 
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $1 
      RETURNING id, email, created_at, updated_at, is_active
    `;
    
    const values = [userId, ...fields.map(field => updates[field])];
    const result = await pool.query(query, values);
    return result.rows[0] || null;
  },

  // Deactivate user account
  async deactivateUser(userId) {
    const query = `
      UPDATE users 
      SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $1
    `;
    await pool.query(query, [userId]);
  }
};
