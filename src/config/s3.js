import { S3Client, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

// Create S3 client
export const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

// S3 utility functions
export const s3Utils = {
  // Generate presigned URL for upload
  async getUploadUrl(key, contentType, expiresIn = 300) {
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      ContentType: contentType,
      Metadata: {
        uploadedAt: new Date().toISOString()
      }
    });
    
    return await getSignedUrl(s3Client, command, { expiresIn });
  },

  // Generate presigned URL for download/view
  async getDownloadUrl(key, expiresIn = 3600) {
    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key
    });
    
    return await getSignedUrl(s3Client, command, { expiresIn });
  },

  // Delete object from S3
  async deleteObject(key) {
    const command = new DeleteObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key
    });
    
    return await s3Client.send(command);
  },

  // Check if object exists
  async objectExists(key) {
    try {
      const command = new HeadObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key
      });
      
      await s3Client.send(command);
      return true;
    } catch (error) {
      if (error.name === 'NotFound') {
        return false;
      }
      throw error;
    }
  },

  // Get object metadata
  async getObjectMetadata(key) {
    try {
      const command = new HeadObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key
      });
      
      const result = await s3Client.send(command);
      
      return {
        contentType: result.ContentType,
        contentLength: result.ContentLength,
        lastModified: result.LastModified,
        metadata: result.Metadata
      };
    } catch (error) {
      throw error;
    }
  }
};

// Validate S3 configuration
export const validateS3Config = () => {
  const requiredVars = [
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'S3_BUCKET'
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.warn(`⚠️  Missing S3 configuration: ${missingVars.join(', ')}`);
    console.warn('   Photo upload functionality will be limited');
    return false;
  }
  
  console.log('✅ S3 configuration validated');
  return true;
};

export default s3Client;
