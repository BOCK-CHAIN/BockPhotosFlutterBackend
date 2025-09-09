import express from 'express';
import { 
  getUploadUrl, 
  listPhotos, 
  getPhoto, 
  deletePhoto, 
  updatePhoto 
} from '../controllers/photoController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// All photo routes require authentication
router.use(authenticateToken);

// Photo management routes
router.post('/upload-url', getUploadUrl);        // Get presigned URL for S3 upload
router.get('/', listPhotos);                     // List user's photos with pagination
router.get('/:id', getPhoto);                    // Get specific photo
router.put('/:id', updatePhoto);                 // Update photo metadata
router.delete('/:id', deletePhoto);              // Delete photo

export default router;
