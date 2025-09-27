-- Migration script to create photos table for S3 metadata tracking
-- Based on analysis of photoController.js queries

-- Create photos table
CREATE TABLE photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_key VARCHAR(500) NOT NULL,                    -- S3 object key/path
    original_name VARCHAR(255) NOT NULL,               -- Original filename
    content_type VARCHAR(100) NOT NULL,                -- MIME type (image/jpeg, etc.)
    file_size BIGINT NOT NULL,                         -- File size in bytes
    title VARCHAR(255),                                -- Optional photo title
    description TEXT,                                  -- Optional photo description
    tags TEXT[],                                       -- Optional array of tags
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_photos_user_id ON photos(user_id);
CREATE INDEX idx_photos_created_at ON photos(created_at DESC);
CREATE INDEX idx_photos_file_key ON photos(file_key);
CREATE INDEX idx_photos_content_type ON photos(content_type);

-- Apply updated_at trigger to photos table
CREATE TRIGGER update_photos_updated_at BEFORE UPDATE ON photos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE photos IS 'Stores metadata for photos uploaded to S3';
COMMENT ON COLUMN photos.file_key IS 'S3 object key/path for the uploaded file';
COMMENT ON COLUMN photos.original_name IS 'Original filename when uploaded';
COMMENT ON COLUMN photos.content_type IS 'MIME type of the uploaded file';
COMMENT ON COLUMN photos.file_size IS 'File size in bytes';
COMMENT ON COLUMN photos.title IS 'Optional user-defined title for the photo';
COMMENT ON COLUMN photos.description IS 'Optional user-defined description for the photo';
COMMENT ON COLUMN photos.tags IS 'Optional array of tags for the photo';
