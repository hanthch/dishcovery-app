const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { requireAuth } = require('../middleware/auth');
const { supabase } = require('../config/supabase');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  },
});

// POST /api/v1/upload - Upload image
router.post('/', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileName = `${Date.now()}-${req.file.originalname}`;
    const filePath = `uploads/${fileName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('images')
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        cacheControl: '3600',
      });

    if (error) throw error;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('images')
      .getPublicUrl(filePath);

    res.json({
      data: {
        url: urlData.publicUrl,
        path: filePath,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/v1/upload/sign-cloudinary
router.post('/sign-cloudinary', requireAuth, async (req, res) => {
  try {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const defaultFolder = process.env.CLOUDINARY_UPLOAD_FOLDER || 'dishcovery/posts';

    if (!cloudName || !apiKey || !apiSecret) {
      return res.status(500).json({ error: 'Cloudinary env vars are missing' });
    }

    //folder per page
    const allowedFolders = new Set([
      'dishcovery/posts',
      'dishcovery/restaurants',
      'dishcovery/avatars',
      'dishcovery/reviews',
      // add more later as needed
    ]);

    const requestedFolder =
      typeof req.body?.folder === 'string' ? req.body.folder.trim() : '';

    // Optional: allow client to request folder/type, but keep safe defaults
    const folder = allowedFolders.has(requestedFolder)
      ? requestedFolder
      : defaultFolder;

    // Allow image or video
    const requestedType =
      req.body?.resourceType === 'video' ? 'video' : 'image';

    const resourceType = requestedType;

    const timestamp = Math.floor(Date.now() / 1000);

    // You can include extra signed params if you want (e.g. tags, context, eager...)
    const paramsToSign = {
      folder,
      timestamp,
    };

    // Cloudinary signature must be built from sorted params
    const paramString = Object.keys(paramsToSign)
      .sort()
      .map((key) => `${key}=${paramsToSign[key]}`)
      .join('&');

    const signature = crypto
      .createHash('sha1')
      .update(paramString + apiSecret)
      .digest('hex');

    return res.json({
      data: {
        cloudName,
        apiKey,
        timestamp,
        folder,
        signature,
        resourceType,
      },
    });
  } catch (error) {
    console.error('[Cloudinary sign] error:', error);
    return res.status(500).json({ error: 'Failed to create Cloudinary signature' });
  }
});

module.exports = router;