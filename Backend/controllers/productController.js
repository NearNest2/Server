const Product = require('../models/productModel');
const multer = require('multer');
const AWS = require('aws-sdk');
const User = require('../models/userModel');

// AWS S3 configuration
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
});

// Multer configuration
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    },
});

const uploadToS3 = async (file) => {
    if (!file) return null;

    try {
        const filename = `products/${Date.now()}-${file.originalname}`;
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
        throw new Error('Image upload failed');
    }
};

const productController = {
    async getPublicProducts(req, res) {
        try {
            // First check if a user/restaurant exists with this ID
            const user = await User.findOne({ restaurantId: req.params.restaurantId });
            
            if (!user) {
                return res.status(404).json({ message: 'Restaurant not found' });
            }
    
            // Fetch only active products for the restaurant
            const products = await Product.find({ 
                restaurantId: req.params.restaurantId,
                inStock: true
            })
            .select('category itemName pricingType type unitType variants imageUrl basePrice mrp sellingPrice')
            .sort({ category: 1, itemName: 1 });
    
            // Group products by category
            const categorizedProducts = products.reduce((acc, product) => {
                if (!acc[product.category]) {
                    acc[product.category] = [];
                }
                acc[product.category].push(product);
                return acc;
            }, {});
    
            // Include basic restaurant info in the response
            const response = {
                restaurantInfo: {
                    name: user.restaurantName,
                    outlet: user.outletName
                },
                menu: categorizedProducts
            };
    
            res.json(response);
        } catch (err) {
            console.error('Error fetching public products:', err);
            res.status(500).json({ message: 'Failed to fetch menu' });
        }
    },

    // Get products for the restaurant owner's own account
    async getRestaurantOwnerProducts(req, res) {
        try {
            const products = await Product.find({ 
                restaurantId: req.user.restaurantId 
            })
            .sort({ createdAt: -1 });
            
            res.json(products);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    async getProducts(req, res) {
        try {
            const products = await Product.find({ restaurantId: req.user.restaurantId })
                                    .sort({ createdAt: -1 });
            res.json(products);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    // Create a new product
    async createProduct(req, res) {
            try {
                if (!req.user.restaurantId) {
                    return res.status(401).json({ message: 'Restaurant ID is required' });
                }
    
                const imageUrl = await uploadToS3(req.file);
                const { 
                    category, 
                    itemName, 
                    pricingType, 
                    basePrice, 
                    mrp, 
                    sellingPrice, 
                    type, 
                    unitType, 
                    variants 
                } = req.body;
    
                const parsedVariants = typeof variants === 'string' ? JSON.parse(variants) : variants;
    
                // Validate required fields based on pricing type
                if (!category || !itemName || !type || !unitType || !parsedVariants || !pricingType) {
                    return res.status(400).json({ message: 'Missing required fields' });
                }
    
                if (pricingType === 'basePrice' && !basePrice) {
                    return res.status(400).json({ message: 'Base price is required' });
                }
    
                if (pricingType === 'mrp' && (!mrp || !sellingPrice)) {
                    return res.status(400).json({ message: 'MRP and selling price are required' });
                }
    
                if (pricingType === 'mrp' && parseFloat(sellingPrice) > parseFloat(mrp)) {
                    return res.status(400).json({ message: 'Selling price cannot be greater than MRP' });
                }
    
                const productData = {
                    restaurantId: req.user.restaurantId,
                    category,
                    itemName,
                    pricingType,
                    type,
                    unitType,
                    variants: parsedVariants,
                    imageUrl,
                };
    
                if (pricingType === 'basePrice') {
                    productData.basePrice = parseFloat(basePrice);
                } else {
                    productData.mrp = parseFloat(mrp);
                    productData.sellingPrice = parseFloat(sellingPrice);
                }
    
                const newProduct = new Product(productData);
                const savedProduct = await newProduct.save();
                res.status(201).json(savedProduct);
            } catch (err) {
                console.error('Create product error:', err);
                res.status(400).json({ message: err.message });
            }
    },
    
    async updateProduct(req, res) {
            try {
                const product = await Product.findOne({
                    _id: req.params.id,
                    restaurantId: req.user.restaurantId
                });
    
                if (!product) {
                    return res.status(404).json({ message: 'Product not found' });
                }
    
                let imageUrl = product.imageUrl;
                if (req.file) {
                    if (product.imageUrl) {
                        try {
                            const oldKey = product.imageUrl.split('/').slice(-2).join('/');
                            await s3.deleteObject({
                                Bucket: process.env.AWS_S3_BUCKET_NAME,
                                Key: oldKey,
                            }).promise();
                        } catch (error) {
                            console.warn('Failed to delete old image:', error);
                        }
                    }
                    imageUrl = await uploadToS3(req.file);
                }
    
                const updates = { ...req.body };
                
                // Validate pricing type updates
                if (updates.pricingType === 'mrp') {
                    if (!updates.mrp || !updates.sellingPrice) {
                        return res.status(400).json({ 
                            message: 'MRP and selling price are required for MRP pricing type' 
                        });
                    }
                    if (parseFloat(updates.sellingPrice) > parseFloat(updates.mrp)) {
                        return res.status(400).json({ 
                            message: 'Selling price cannot be greater than MRP' 
                        });
                    }
                } else if (updates.pricingType === 'basePrice' && !updates.basePrice) {
                    return res.status(400).json({ 
                        message: 'Base price is required for base price pricing type' 
                    });
                }
    
                if (updates.variants) {
                    updates.variants = typeof updates.variants === 'string' ? 
                        JSON.parse(updates.variants) : updates.variants;
                }
    
                Object.keys(updates).forEach((key) => {
                    if (key !== '_id' && key !== 'restaurantId') {
                        product[key] = updates[key];
                    }
                });
                product.imageUrl = imageUrl;
    
                await product.save();
                res.json(product);
            } catch (err) {
                res.status(400).json({ message: err.message });
            }
    },

    // Update product stock status
    async updateStockStatus(req, res) {
        try {
            const { id } = req.params;
            const { inStock, duration } = req.body;
            
            const product = await Product.findOne({
                _id: id,
                restaurantId: req.user.restaurantId
            });

            if (!product) {
                return res.status(404).json({ message: 'Product not found' });
            }
            
            product.inStock = inStock;
            
            if (!inStock && duration) {
                let futureDate;
                
                switch (duration) {
                    case '2hour':
                        futureDate = new Date(Date.now() + 2 * 60 * 60 * 1000);
                        break;
                    case '6hour':
                        futureDate = new Date(Date.now() + 6 * 60 * 60 * 1000);
                        break;
                    case '1day':
                        futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
                        break;
                    case '1week':
                        futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
                        break;
                    case 'indefinite':
                        futureDate = null;
                        break;
                    default:
                        return res.status(400).json({ message: 'Invalid duration value' });
                }
                
                product.outOfStockUntil = futureDate;
            } else if (inStock) {
                product.outOfStockUntil = null;
            }
            
            const savedProduct = await product.save();
            res.json(savedProduct);
        } catch (err) {
            console.error('Stock update error:', err);
            res.status(500).json({ 
                message: err.message,
                details: err.errors
            });
        }
    },

    // Delete a product
    async deleteProduct(req, res) {
        try {
            const product = await Product.findOne({
                _id: req.params.id,
                restaurantId: req.user.restaurantId
            });

            if (!product) {
                return res.status(404).json({ message: 'Product not found' });
            }

            if (product.imageUrl) {
                try {
                    const oldKey = product.imageUrl.split('/').slice(-2).join('/');
                    await s3.deleteObject({
                        Bucket: process.env.AWS_S3_BUCKET_NAME,
                        Key: oldKey,
                    }).promise();
                } catch (error) {
                    console.warn('Failed to delete image from S3:', error);
                }
            }

            await product.deleteOne();
            res.json({ message: 'Product deleted successfully' });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },  async checkProductAvailability(req, res) {
        try {
            const product = await Product.findById(req.params.productId)
                .select('inStock outOfStockUntil');
            
            // Check if product is currently available
            const isAvailable = product.inStock && 
                (!product.outOfStockUntil || product.outOfStockUntil > new Date());

            res.json({ 
                productId: req.params.productId,
                isAvailable 
            });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    }
};

module.exports = { productController, upload };