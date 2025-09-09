import { pool } from '../config/db.js';
import { s3Utils, validateS3Config } from '../config/s3.js';

// Get presigned URL for direct S3 upload
export const getUploadUrl = async (req, res, next) => {
  try {
    const { filename, contentType, fileSize } = req.body;
    
    // Validate input
    if (!filename || !contentType) {
      return res.status(400).json({
        error: {
          message: 'Filename and content type are required',
          statusCode: 400
        }
      });
    }

    // Validate file type (basic check)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(contentType)) {
      return res.status(400).json({
        error: {
          message: 'Invalid file type. Only images are allowed',
          statusCode: 400
        }
      });
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (fileSize && fileSize > maxSize) {
      return res.status(400).json({
        error: {
          message: 'File size too large. Maximum size is 5MB',
          statusCode: 400
        }
      });
    }

    const fileKey = `uploads/${req.user.id}/${Date.now()}_${filename}`;
    
    // Check if S3 is configured
    if (!validateS3Config()) {
      return res.status(503).json({
        error: {
          message: 'File upload service temporarily unavailable',
          statusCode: 503
        }
      });
    }

    const uploadUrl = await s3Utils.getUploadUrl(fileKey, contentType, 300);
    
    res.json({ 
      uploadUrl, 
      fileKey,
      expiresIn: 300
    });
  } catch (err) {
    next(err);
  }
};

// List user's photos
export const listPhotos = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    // Get photos with pagination
    const result = await pool.query(
      `SELECT id, file_key, original_name, content_type, file_size, created_at, updated_at 
       FROM photos 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );
    
    // Get total count
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM photos WHERE user_id = $1',
      [req.user.id]
    );
    
    const totalPhotos = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalPhotos / limit);
    
    res.json({
      photos: result.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalPhotos,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (err) {
    next(err);
  }
};

// Get photo by ID
export const getPhoto = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM photos WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          message: 'Photo not found',
          statusCode: 404
        }
      });
    }
    
    res.json({ photo: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// Delete photo
export const deletePhoto = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Get photo info before deletion
    const photoResult = await pool.query(
      'SELECT file_key FROM photos WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    
    if (photoResult.rows.length === 0) {
      return res.status(404).json({
        error: {
          message: 'Photo not found',
          statusCode: 404
        }
      });
    }
    
    // Delete from S3 if configured
    if (validateS3Config()) {
      try {
        await s3Utils.deleteObject(photoResult.rows[0].file_key);
      } catch (s3Error) {
        console.error('S3 deletion error:', s3Error);
        // Continue with database deletion even if S3 fails
      }
    }
    
    // Delete from database
    await pool.query(
      'DELETE FROM photos WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    
    res.json({ 
      message: 'Photo deleted successfully',
      photoId: id
    });
  } catch (err) {
    next(err);
  }
};

// Update photo metadata
export const updatePhoto = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, tags } = req.body;
    
    const result = await pool.query(
      `UPDATE photos 
       SET title = COALESCE($1, title), 
           description = COALESCE($2, description), 
           tags = COALESCE($3, tags),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 AND user_id = $5
       RETURNING *`,
      [title, description, tags, id, req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          message: 'Photo not found',
          statusCode: 404
        }
      });
    }
    
    res.json({ 
      message: 'Photo updated successfully',
      photo: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
};
