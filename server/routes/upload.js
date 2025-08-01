const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const { verifyToken, requireEngineer } = require('../middleware/auth');
const googleDriveService = require('../services/googleDrive');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const router = express.Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter function
const fileFilter = (req, file, cb) => {
  const allowedTypes = process.env.ALLOWED_IMAGE_TYPES?.split(',') || ['image/jpeg', 'image/png', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.UPLOAD_MAX_SIZE) || 10 * 1024 * 1024, // 10MB default
    files: 1 // Only one file at a time
  },
  fileFilter: fileFilter
});

/**
 * @route   POST /api/upload/driver-photo
 * @desc    Upload driver photo to Google Drive
 * @access  Private (Engineers)
 */
router.post('/driver-photo', [verifyToken, requireEngineer], (req, res) => {
  upload.single('photo')(req, res, async (err) => {
    try {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
              error: {
                message: 'File too large',
                details: `Maximum file size is ${process.env.UPLOAD_MAX_SIZE || '10MB'}`
              }
            });
          }
          if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
              error: {
                message: 'Too many files',
                details: 'Only one file allowed per upload'
              }
            });
          }
        }
        
        return res.status(400).json({
          error: {
            message: 'Upload error',
            details: err.message
          }
        });
      }

      if (!req.file) {
        return res.status(400).json({
          error: {
            message: 'No file uploaded'
          }
        });
      }

      const { driverId, driverName } = req.body;
      
      if (!driverId) {
        return res.status(400).json({
          error: {
            message: 'Driver ID is required'
          }
        });
      }

      // Process image - resize and optimize
      let processedBuffer;
      try {
        processedBuffer = await sharp(req.file.buffer)
          .resize(1200, 1200, { 
            fit: 'inside',
            withoutEnlargement: true 
          })
          .jpeg({ 
            quality: 85,
            progressive: true 
          })
          .toBuffer();
      } catch (imageError) {
        return res.status(400).json({
          error: {
            message: 'Invalid image file',
            details: 'Unable to process the uploaded image'
          }
        });
      }

      // Generate unique filename
      const fileExtension = '.jpg'; // Always save as JPEG after processing
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const uniqueId = uuidv4().substring(0, 8);
      const fileName = `${driverId}_${timestamp}_${uniqueId}${fileExtension}`;

      // Upload to Google Drive
      const uploadResult = await googleDriveService.uploadFile(
        processedBuffer,
        fileName,
        'image/jpeg',
        driverId
      );

      res.json({
        message: 'Driver photo uploaded successfully',
        file: {
          originalName: req.file.originalname,
          fileName: uploadResult.fileName,
          fileId: uploadResult.fileId,
          webViewLink: uploadResult.webViewLink,
          webContentLink: uploadResult.webContentLink,
          size: processedBuffer.length,
          mimeType: 'image/jpeg',
          driverId: driverId
        },
        uploadedBy: req.user.name || req.user.email,
        uploadedAt: new Date().toISOString()
      });

    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({
        error: {
          message: 'Failed to upload file',
          details: error.message
        }
      });
    }
  });
});

/**
 * @route   POST /api/upload/multiple-photos
 * @desc    Upload multiple driver photos
 * @access  Private (Engineers)
 */
router.post('/multiple-photos', [verifyToken, requireEngineer], (req, res) => {
  const uploadMultiple = multer({
    storage: storage,
    limits: {
      fileSize: parseInt(process.env.UPLOAD_MAX_SIZE) || 10 * 1024 * 1024,
      files: 5 // Maximum 5 files
    },
    fileFilter: fileFilter
  });

  uploadMultiple.array('photos', 5)(req, res, async (err) => {
    try {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
              error: {
                message: 'One or more files too large',
                details: `Maximum file size is ${process.env.UPLOAD_MAX_SIZE || '10MB'}`
              }
            });
          }
          if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
              error: {
                message: 'Too many files',
                details: 'Maximum 5 files allowed per upload'
              }
            });
          }
        }
        
        return res.status(400).json({
          error: {
            message: 'Upload error',
            details: err.message
          }
        });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          error: {
            message: 'No files uploaded'
          }
        });
      }

      const { driverId } = req.body;
      
      if (!driverId) {
        return res.status(400).json({
          error: {
            message: 'Driver ID is required'
          }
        });
      }

      const uploadPromises = req.files.map(async (file, index) => {
        try {
          // Process image
          const processedBuffer = await sharp(file.buffer)
            .resize(1200, 1200, { 
              fit: 'inside',
              withoutEnlargement: true 
            })
            .jpeg({ 
              quality: 85,
              progressive: true 
            })
            .toBuffer();

          // Generate unique filename
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const uniqueId = uuidv4().substring(0, 8);
          const fileName = `${driverId}_${timestamp}_${index + 1}_${uniqueId}.jpg`;

          // Upload to Google Drive
          const uploadResult = await googleDriveService.uploadFile(
            processedBuffer,
            fileName,
            'image/jpeg',
            driverId
          );

          return {
            success: true,
            originalName: file.originalname,
            fileName: uploadResult.fileName,
            fileId: uploadResult.fileId,
            webViewLink: uploadResult.webViewLink,
            webContentLink: uploadResult.webContentLink,
            size: processedBuffer.length
          };
        } catch (uploadError) {
          return {
            success: false,
            originalName: file.originalname,
            error: uploadError.message
          };
        }
      });

      const results = await Promise.all(uploadPromises);
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      res.json({
        message: `${successful.length} of ${req.files.length} files uploaded successfully`,
        successful: successful,
        failed: failed,
        driverId: driverId,
        uploadedBy: req.user.name || req.user.email,
        uploadedAt: new Date().toISOString()
      });

    } catch (error) {
      console.error('Multiple upload error:', error);
      res.status(500).json({
        error: {
          message: 'Failed to upload files',
          details: error.message
        }
      });
    }
  });
});

/**
 * @route   DELETE /api/upload/file/:fileId
 * @desc    Delete uploaded file from Google Drive
 * @access  Private (Engineers)
 */
router.delete('/file/:fileId', [verifyToken, requireEngineer], async (req, res) => {
  try {
    const { fileId } = req.params;

    if (!fileId) {
      return res.status(400).json({
        error: {
          message: 'File ID is required'
        }
      });
    }

    await googleDriveService.deleteFile(fileId);

    res.json({
      message: 'File deleted successfully',
      fileId: fileId,
      deletedBy: req.user.name || req.user.email,
      deletedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('File deletion error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to delete file',
        details: error.message
      }
    });
  }
});

/**
 * @route   GET /api/upload/info
 * @desc    Get upload configuration info
 * @access  Private
 */
router.get('/info', verifyToken, (req, res) => {
  const maxSize = parseInt(process.env.UPLOAD_MAX_SIZE) || 10 * 1024 * 1024;
  const allowedTypes = process.env.ALLOWED_IMAGE_TYPES?.split(',') || ['image/jpeg', 'image/png', 'image/webp'];

  res.json({
    maxFileSize: maxSize,
    maxFileSizeMB: Math.round(maxSize / (1024 * 1024)),
    allowedTypes: allowedTypes,
    maxFilesPerUpload: 5,
    supportedOperations: [
      'Single photo upload',
      'Multiple photos upload',
      'Automatic image optimization',
      'Google Drive integration'
    ]
  });
});

/**
 * @route   POST /api/upload/validate
 * @desc    Validate file before upload (client-side helper)
 * @access  Private
 */
router.post('/validate', verifyToken, (req, res) => {
  const { fileName, fileSize, mimeType } = req.body;

  if (!fileName || !fileSize || !mimeType) {
    return res.status(400).json({
      error: {
        message: 'Missing file information',
        details: 'fileName, fileSize, and mimeType are required'
      }
    });
  }

  const maxSize = parseInt(process.env.UPLOAD_MAX_SIZE) || 10 * 1024 * 1024;
  const allowedTypes = process.env.ALLOWED_IMAGE_TYPES?.split(',') || ['image/jpeg', 'image/png', 'image/webp'];

  const validation = {
    valid: true,
    errors: []
  };

  // Check file size
  if (fileSize > maxSize) {
    validation.valid = false;
    validation.errors.push({
      type: 'FILE_SIZE',
      message: `File size ${Math.round(fileSize / (1024 * 1024))}MB exceeds maximum ${Math.round(maxSize / (1024 * 1024))}MB`
    });
  }

  // Check file type
  if (!allowedTypes.includes(mimeType)) {
    validation.valid = false;
    validation.errors.push({
      type: 'FILE_TYPE',
      message: `File type ${mimeType} not allowed. Supported types: ${allowedTypes.join(', ')}`
    });
  }

  // Check file extension
  const ext = path.extname(fileName).toLowerCase();
  const validExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
  if (!validExtensions.includes(ext)) {
    validation.valid = false;
    validation.errors.push({
      type: 'FILE_EXTENSION',
      message: `File extension ${ext} not allowed. Supported extensions: ${validExtensions.join(', ')}`
    });
  }

  res.json(validation);
});

// Error handling middleware specific to upload routes
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    return res.status(400).json({
      error: {
        message: 'Upload error',
        details: error.message,
        code: error.code
      }
    });
  }

  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({
      error: {
        message: 'Invalid file type',
        details: error.message
      }
    });
  }

  next(error);
});

module.exports = router;