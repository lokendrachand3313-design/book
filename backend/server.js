// ============================================
// KitabSansar - Backend Server
// Student Textbook Marketplace API
// ============================================

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs-extra');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database file paths
const DB_PATH = path.join(__dirname, 'database');
const BOOKS_FILE = path.join(DB_PATH, 'books.json');
const USERS_FILE = path.join(DB_PATH, 'users.json');
const MESSAGES_FILE = path.join(DB_PATH, 'messages.json');

// Ensure database directory exists
fs.ensureDirSync(DB_PATH);

// Initialize database files if they don't exist
if (!fs.existsSync(BOOKS_FILE)) {
    fs.writeJsonSync(BOOKS_FILE, []);
}
if (!fs.existsSync(USERS_FILE)) {
    fs.writeJsonSync(USERS_FILE, []);
}
if (!fs.existsSync(MESSAGES_FILE)) {
    fs.writeJsonSync(MESSAGES_FILE, {});
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        fs.ensureDirSync(uploadDir);
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'kitabsansar_secret_key_2024';
const JWT_EXPIRES_IN = '7d';

// Helper functions
const readJSON = (filePath) => {
    try {
        return fs.readJsonSync(filePath);
    } catch (error) {
        return [];
    }
};

const writeJSON = (filePath, data) => {
    fs.writeJsonSync(filePath, data, { spaces: 2 });
};

// ========== AUTHENTICATION MIDDLEWARE ==========
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// ========== USER ROUTES ==========

// Register new seller
app.post('/api/auth/register', async (req, res) => {
    try {
        const { firstName, lastName, email, mobile, city, password } = req.body;
        
        // Validate input
        if (!firstName || !email || !city || !password) {
            return res.status(400).json({ error: 'Please fill all required fields' });
        }
        
        const users = readJSON(USERS_FILE);
        
        // Check if email already exists
        if (users.find(u => u.email === email)) {
            return res.status(400).json({ error: 'Email already registered' });
        }
        
        // Check if mobile already exists
        const fullMobile = mobile ? '+977' + mobile : '';
        if (mobile && users.find(u => u.mobile === fullMobile)) {
            return res.status(400).json({ error: 'Mobile number already registered' });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create new user
        const newUser = {
            id: uuidv4(),
            firstName: firstName.trim(),
            lastName: lastName ? lastName.trim() : '',
            email: email.trim(),
            mobile: fullMobile,
            city: city,
            password: hashedPassword,
            totalCommissionPaid: 0,
            booksListed: 0,
            createdAt: new Date().toISOString(),
            role: 'seller'
        };
        
        users.push(newUser);
        writeJSON(USERS_FILE, users);
        
        // Generate JWT token
        const token = jwt.sign(
            { id: newUser.id, email: newUser.email, firstName: newUser.firstName },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );
        
        // Remove password from response
        const { password: _, ...userWithoutPassword } = newUser;
        
        res.status(201).json({
            success: true,
            token,
            user: userWithoutPassword
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Server error during registration' });
    }
});

// Login user
app.post('/api/auth/login', async (req, res) => {
    try {
        const { identifier, password } = req.body;
        
        if (!identifier || !password) {
            return res.status(400).json({ error: 'Please enter email/mobile and password' });
        }
        
        const users = readJSON(USERS_FILE);
        
        // Check if identifier is mobile (10 digits) or email
        const isMobile = /^[0-9]{10}$/.test(identifier);
        const searchValue = isMobile ? '+977' + identifier : identifier;
        
        const user = users.find(u => u.email === searchValue || u.mobile === searchValue);
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, email: user.email, firstName: user.firstName },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );
        
        // Remove password from response
        const { password: _, ...userWithoutPassword } = user;
        
        res.json({
            success: true,
            token,
            user: userWithoutPassword
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error during login' });
    }
});

// Google Authentication
app.post('/api/auth/google', async (req, res) => {
    try {
        const { email, name } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }
        
        const users = readJSON(USERS_FILE);
        let user = users.find(u => u.email === email);
        
        if (!user) {
            // Create new user with Google
            user = {
                id: uuidv4(),
                firstName: name || email.split('@')[0],
                lastName: '',
                email: email,
                mobile: '',
                city: '',
                password: '',
                provider: 'google',
                totalCommissionPaid: 0,
                booksListed: 0,
                createdAt: new Date().toISOString(),
                role: 'seller'
            };
            users.push(user);
            writeJSON(USERS_FILE, users);
        }
        
        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, email: user.email, firstName: user.firstName },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );
        
        const { password: _, ...userWithoutPassword } = user;
        
        res.json({
            success: true,
            token,
            user: userWithoutPassword
        });
        
    } catch (error) {
        console.error('Google auth error:', error);
        res.status(500).json({ error: 'Server error during Google authentication' });
    }
});

// Mobile Authentication
app.post('/api/auth/mobile', async (req, res) => {
    try {
        const { mobile, name } = req.body;
        
        if (!mobile || !/^[0-9]{10}$/.test(mobile)) {
            return res.status(400).json({ error: 'Valid 10-digit mobile number required' });
        }
        
        const fullMobile = '+977' + mobile;
        const users = readJSON(USERS_FILE);
        let user = users.find(u => u.mobile === fullMobile);
        
        if (!user) {
            // Create new user with mobile
            user = {
                id: uuidv4(),
                firstName: name || 'MobileUser',
                lastName: '',
                email: '',
                mobile: fullMobile,
                city: '',
                password: '',
                provider: 'mobile',
                totalCommissionPaid: 0,
                booksListed: 0,
                createdAt: new Date().toISOString(),
                role: 'seller'
            };
            users.push(user);
            writeJSON(USERS_FILE, users);
        }
        
        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, mobile: user.mobile, firstName: user.firstName },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );
        
        const { password: _, ...userWithoutPassword } = user;
        
        res.json({
            success: true,
            token,
            user: userWithoutPassword
        });
        
    } catch (error) {
        console.error('Mobile auth error:', error);
        res.status(500).json({ error: 'Server error during mobile authentication' });
    }
});

// Get current user profile
app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        const users = readJSON(USERS_FILE);
        const user = users.find(u => u.id === req.user.id);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const { password: _, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
        
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ========== BOOK ROUTES ==========

// Get all available books (not sold)
app.get('/api/books', async (req, res) => {
    try {
        const books = readJSON(BOOKS_FILE);
        const search = req.query.search;
        
        let filteredBooks = books.filter(book => !book.isSold);
        
        // Apply search filter
        if (search) {
            const query = search.toLowerCase();
            filteredBooks = filteredBooks.filter(book => 
                book.title.toLowerCase().includes(query) || 
                (book.author && book.author.toLowerCase().includes(query))
            );
        }
        
        // Sort by latest first
        filteredBooks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        res.json(filteredBooks);
        
    } catch (error) {
        console.error('Get books error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get book by ID
app.get('/api/books/:id', async (req, res) => {
    try {
        const books = readJSON(BOOKS_FILE);
        const book = books.find(b => b.id === req.params.id);
        
        if (!book) {
            return res.status(404).json({ error: 'Book not found' });
        }
        
        res.json(book);
        
    } catch (error) {
        console.error('Get book error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create new book listing (requires authentication)
app.post('/api/books', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        const { title, author, price, description, category } = req.body;
        
        if (!title || !price) {
            return res.status(400).json({ error: 'Title and price are required' });
        }
        
        const books = readJSON(BOOKS_FILE);
        
        const newBook = {
            id: uuidv4(),
            title: title.trim(),
            author: author ? author.trim() : 'Unknown Author',
            price: price + ' NPR',
            priceRaw: parseFloat(price),
            description: description ? description.trim() : 'Well-maintained used book',
            seller: `${req.user.firstName}`,
            sellerId: req.user.id,
            category: category || 'Book',
            imageUrl: req.file ? `/uploads/${req.file.filename}` : null,
            interestCount: 0,
            isSold: false,
            createdAt: new Date().toISOString()
        };
        
        books.unshift(newBook);
        writeJSON(BOOKS_FILE, books);
        
        res.status(201).json(newBook);
        
    } catch (error) {
        console.error('Create book error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Mark book as sold (with commission)
app.post('/api/books/:id/sold', authenticateToken, async (req, res) => {
    try {
        const books = readJSON(BOOKS_FILE);
        const users = readJSON(USERS_FILE);
        
        const bookIndex = books.findIndex(b => b.id === req.params.id);
        
        if (bookIndex === -1) {
            return res.status(404).json({ error: 'Book not found' });
        }
        
        const book = books[bookIndex];
        
        if (book.sellerId !== req.user.id) {
            return res.status(403).json({ error: 'You can only sell your own books' });
        }
        
        if (book.isSold) {
            return res.status(400).json({ error: 'Book already sold' });
        }
        
        const commission = Math.round(book.priceRaw * 0.1);
        
        // Update seller's commission paid
        const userIndex = users.findIndex(u => u.id === req.user.id);
        if (userIndex !== -1) {
            users[userIndex].totalCommissionPaid = (users[userIndex].totalCommissionPaid || 0) + commission;
            writeJSON(USERS_FILE, users);
        }
        
        // Remove book from listings
        books.splice(bookIndex, 1);
        writeJSON(BOOKS_FILE, books);
        
        res.json({
            success: true,
            message: 'Book marked as sold',
            commission: commission
        });
        
    } catch (error) {
        console.error('Mark sold error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get books by seller
app.get('/api/seller/books', authenticateToken, async (req, res) => {
    try {
        const books = readJSON(BOOKS_FILE);
        const sellerBooks = books.filter(b => b.sellerId === req.user.id);
        
        res.json(sellerBooks);
        
    } catch (error) {
        console.error('Get seller books error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ========== CHAT ROUTES ==========

// Get messages for a book
app.get('/api/chat/:bookId', async (req, res) => {
    try {
        const messages = readJSON(MESSAGES_FILE);
        const bookMessages = messages[req.params.bookId] || [];
        
        res.json(bookMessages);
        
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Send message
app.post('/api/chat/:bookId', async (req, res) => {
    try {
        const { senderName, text } = req.body;
        
        if (!senderName || !text) {
            return res.status(400).json({ error: 'Sender name and text are required' });
        }
        
        const messages = readJSON(MESSAGES_FILE);
        
        if (!messages[req.params.bookId]) {
            messages[req.params.bookId] = [];
        }
        
        const newMessage = {
            id: uuidv4(),
            senderName: senderName,
            text: text.trim(),
            timestamp: new Date().toISOString()
        };
        
        messages[req.params.bookId].push(newMessage);
        writeJSON(MESSAGES_FILE, messages);
        
        res.status(201).json(newMessage);
        
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ========== DASHBOARD STATS ==========

// Get seller dashboard stats
app.get('/api/seller/stats', authenticateToken, async (req, res) => {
    try {
        const books = readJSON(BOOKS_FILE);
        const users = readJSON(USERS_FILE);
        
        const sellerBooks = books.filter(b => b.sellerId === req.user.id);
        const user = users.find(u => u.id === req.user.id);
        
        res.json({
            booksListed: sellerBooks.length,
            booksSold: sellerBooks.filter(b => b.isSold).length,
            totalCommissionPaid: user?.totalCommissionPaid || 0,
            activeListings: sellerBooks.filter(b => !b.isSold).length
        });
        
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ========== ADMIN ROUTES (Optional) ==========

// Get all users (admin only)
app.get('/api/admin/users', authenticateToken, async (req, res) => {
    // Simple admin check - first user is admin
    const users = readJSON(USERS_FILE);
    const user = users.find(u => u.id === req.user.id);
    
    if (user?.email !== 'admin@kitabsansar.com') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    
    const usersWithoutPasswords = users.map(({ password, ...rest }) => rest);
    res.json(usersWithoutPasswords);
});

// Get all books (admin only)
app.get('/api/admin/books', authenticateToken, async (req, res) => {
    const users = readJSON(USERS_FILE);
    const user = users.find(u => u.id === req.user.id);
    
    if (user?.email !== 'admin@kitabsansar.com') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    
    const books = readJSON(BOOKS_FILE);
    res.json(books);
});

// ========== HEALTH CHECK ==========
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'KitabSansar API is running',
        timestamp: new Date().toISOString()
    });
});

// ========== ERROR HANDLING ==========
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: err.message });
    }
    
    res.status(500).json({ error: 'Internal server error' });
});

// ========== START SERVER ==========
app.listen(PORT, () => {
    console.log(`🚀 KitabSansar Server running on port ${PORT}`);
    console.log(`📚 API URL: http://localhost:${PORT}/api`);
    console.log(`💾 Database directory: ${DB_PATH}`);
});
