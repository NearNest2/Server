const Settings = require('../models/settingsModel');
const multer = require('multer');
const AWS = require('aws-sdk');

// Configure AWS SDK
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
});

// Multer configuration
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    },
});

// Helper function for S3 upload
const uploadToS3 = async (file) => {
    if (!file) return null;

    try {
        const filename = `restaurant-logos/${Date.now()}-${file.originalname}`;
        const params = {
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: filename,
            Body: file.buffer,
            ContentType: file.mimetype,
            ACL: 'public-read',
        };

        const uploadResult = await s3.upload(params).promise();
        return uploadResult.Location;
    } catch (error) {
        console.error('S3 upload error:', error);
        throw new Error('Logo upload failed');
    }
};

const settingsController = {
    async getSettings(req, res) {
        try {
            let settings = await Settings.findOne({ restaurantId: req.user.restaurantId });
            
            if (!settings) {
                settings = {
                    restaurantName: '',
                    phoneNumber: '',
                    gstin: '',
                    businessEmail: '',
                    note: 'Thank you Visit Again',
                    logoUrl: ''
                };
            }
            
            res.json(settings);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    async updateSettings(req, res) {
        try {
            const { restaurantName, phoneNumber, gstin, businessEmail, location, note } = req.body;
      
            // Validation checks remain the same...

            // Handle logo upload
            let logoUrl;
            if (req.file) {
                // Find existing settings to check for old logo
                const existingSettings = await Settings.findOne({ restaurantId: req.user.restaurantId });
                
                // Delete old logo logic remains the same...

                // Upload new logo
                logoUrl = await uploadToS3(req.file);
            }

            const settings = await Settings.findOneAndUpdate(
                { restaurantId: req.user.restaurantId },
                {
                    restaurantId: req.user.restaurantId,  // Updated from userEmail
                    restaurantName,
                    phoneNumber,
                    gstin: gstin || '',
                    businessEmail: businessEmail || '',
                    location: location || '',
                    note: note || 'Thank you Visit Again',
                    ...(logoUrl && { logoUrl }),
                    updatedAt: Date.now()
                },
                { 
                    new: true, 
                    upsert: true, 
                    runValidators: true 
                }
            );
          
            res.json(settings);
        } catch (err) {
            res.status(400).json({ message: err.message });
        }
    }
};

module.exports = { settingsController, upload };