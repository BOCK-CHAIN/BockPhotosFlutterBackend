import { pool } from '../config/db.js';
import { s3Utils, validateS3Config } from '../config/s3.js';
import { env } from '../config/env.js';

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

// Finalize photo upload: persist metadata after successful S3 PUT
export const createPhoto = async (req, res, next) => {
  try {
    const { fileKey, originalName, contentType, fileSize } = req.body;

    // Validate required fields
    if (!fileKey || !originalName || !contentType || !fileSize) {
      return res.status(400).json({
        error: {
          message: 'fileKey, originalName, contentType, and fileSize are required',
          statusCode: 400
        }
      });
    }

    // Optional: basic content type guard (align with upload presign)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(contentType)) {
      return res.status(400).json({
        error: {
          message: 'Invalid file type. Only images are allowed',
          statusCode: 400
        }
      });
    }

    // Insert into DB
    const insertResult = await pool.query(
      `INSERT INTO photos (user_id, file_key, original_name, content_type, file_size, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id, file_key, original_name, content_type, file_size, created_at`,
      [req.user.id, fileKey, originalName, contentType, fileSize]
    );

    const photo = insertResult.rows[0];

    // Optional computed public URL if configured
    if (env.PUBLIC_BUCKET_BASE_URL) {
      photo.url = `${env.PUBLIC_BUCKET_BASE_URL.replace(/\/$/, '')}/${photo.file_key}`;
    }

    return res.status(201).json({ photo });
  } catch (err) {
    next(err);
  }
};

// Get presigned URL for viewing/downloading a photo (if using private bucket)
export const getViewUrl = async (req, res, next) => {
  try {
    const { key } = req.query;

    if (!key) {
      return res.status(400).json({
        error: { message: 'key is required', statusCode: 400 }
      });
    }

    if (!validateS3Config()) {
      return res.status(503).json({
        error: { message: 'File service unavailable', statusCode: 503 }
      });
    }

    const url = await s3Utils.getDownloadUrl(key, 3600);
    return res.json({ url, expiresIn: 3600 });
  } catch (err) {
    next(err);
  }
};

// List user's photos
export const listPhotos = async (req, res, next) => {
  try {
    const pageNum = Number.parseInt(req.query.page ?? '1', 10);
    const limitNum = Number.parseInt(req.query.limit ?? '20', 10);
    const page = Number.isFinite(pageNum) && pageNum > 0 ? pageNum : 1;
    const limit = Number.isFinite(limitNum) && limitNum > 0 && limitNum <= 100 ? limitNum : 20;
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT id, file_key, original_name, content_type, file_size, created_at, updated_at
       FROM photos
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM photos WHERE user_id = $1',
      [req.user.id]
    );

    const totalPhotos = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalPhotos / limit);

    return res.json({
      photos: result.rows,
      pagination: {
        currentPage: page,
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
