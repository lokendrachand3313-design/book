// ============================================
// KitabSansar - Books Module
// Handles book listings, search, and selling
// ============================================

const Books = (function() {
    // Private variables
    let books = [];
    let currentSearchQuery = '';
    
    // Storage key
    const STORAGE_KEY = 'kitab_books';
    
    // Default cover image
    const DEFAULT_COVER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23fff0e0'/%3E%3Ctext x='50' y='55' font-size='44' text-anchor='middle' fill='%23ff8c42'%3E📘%3C/text%3E%3C/svg%3E";
    
    // Load books from localStorage
    function loadBooks() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if(stored) {
            books = JSON.parse(stored);
        } else {
            // Default sample books
            books = [
                {
                    id: '1',
                    title: 'Engineering Mathematics III',
                    author: 'Dr. K.C. Rajbanshi',
                    price: '550 NPR',
                    priceRaw: 550,
                    description: '3rd semester, good condition, few highlights',
                    seller: 'Ram Sharma',
                    sellerId: '1',
                    category: 'Textbook',
                    imageDataUrl: DEFAULT_COVER,
                    interestCount: 3,
                    isSold: false,
                    createdAt: Date.now() - 86400000
                },
                {
                    id: '2',
                    title: 'Physics for Scientists and Engineers',
                    author: 'Serway & Jewett',
                    price: '1200 NPR',
                    priceRaw: 1200,
                    description: '9th Edition, like new, no markings',
                    seller: 'Ram Sharma',
                    sellerId: '1',
                    category: 'Textbook',
                    imageDataUrl: DEFAULT_COVER,
                    interestCount: 2,
                    isSold: false,
                    createdAt: Date.now() - 172800000
                }
            ];
            saveBooks();
        }
        // Sort by latest first
        books.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        return books;
    }
    
    // Save books to localStorage
    function saveBooks() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
    }
    
    // Calculate commission (10%)
    function calculateCommission(price) {
        return Math.round(price * 0.1);
    }
    
    // Add new book
    function addBook(title, author, price, description, category, imageDataUrl, sellerId, sellerName) {
        if(!title || !price) {
            return { success: false, error: 'Title and price are required' };
        }
        
        const newBook = {
            id: Date.now().toString(),
            title: title.trim(),
            author: author ? author.trim() : 'Unknown Author',
            price: price + ' NPR',
            priceRaw: parseFloat(price),
            description: description ? description.trim() : 'Well-maintained used book',
            seller: sellerName,
            sellerId: sellerId,
            category: category || 'Book',
            imageDataUrl: imageDataUrl || DEFAULT_COVER,
            interestCount: 0,
            isSold: false,
            createdAt: Date.now()
        };
        
        books.unshift(newBook); // Add to beginning (latest first)
        saveBooks();
        return { success: true, book: newBook };
    }
    
    // Mark book as sold (with commission)
    function markAsSold(bookId, callback) {
        const bookIndex = books.findIndex(b => b.id === bookId);
        if(bookIndex === -1) {
            return { success: false, error: 'Book not found' };
        }
        
        const book = books[bookIndex];
        if(book.isSold) {
            return { success: false, error: 'Book already sold' };
        }
        
        const commission = calculateCommission(book.priceRaw);
        
        // Return book and commission for payment processing
        return { 
            success: true, 
            book: book, 
            commission: commission,
            index: bookIndex
        };
    }
    
    // Confirm sale after commission payment
    function confirmSale(bookId, index) {
        if(index !== undefined) {
            books.splice(index, 1);
        } else {
            const bookIndex = books.findIndex(b => b.id === bookId);
            if(bookIndex !== -1) books.splice(bookIndex, 1);
        }
        saveBooks();
        return true;
    }
    
    // Get available books (not sold)
    function getAvailableBooks() {
        return books.filter(b => !b.isSold);
    }
    
    // Get books by seller
    function getBooksBySeller(sellerId) {
        return books.filter(b => b.sellerId === sellerId);
    }
    
    // Search books
    function searchBooks(query) {
        currentSearchQuery = query;
        if(!query) return getAvailableBooks();
        
        const q = query.toLowerCase();
        return books.filter(b => 
            !b.isSold && (
                b.title.toLowerCase().includes(q) || 
                (b.author && b.author.toLowerCase().includes(q))
            )
        );
    }
    
    // Get current search query
    function getSearchQuery() {
        return currentSearchQuery;
    }
    
    // Increment interest count
    function incrementInterest(bookId) {
        const book = books.find(b => b.id === bookId);
        if(book) {
            book.interestCount = (book.interestCount || 0) + 1;
            saveBooks();
            return true;
        }
        return false;
    }
    
    // Get book by ID
    function getBookById(bookId) {
        return books.find(b => b.id === bookId);
    }
    
    // Get all books
    function getAllBooks() {
        return [...books];
    }
    
    // Get default cover
    function getDefaultCover() {
        return DEFAULT_COVER;
    }
    
    // Public API
    return {
        loadBooks,
        saveBooks,
        addBook,
        markAsSold,
        confirmSale,
        getAvailableBooks,
        getBooksBySeller,
        searchBooks,
        getSearchQuery,
        incrementInterest,
        getBookById,
        getAllBooks,
        getDefaultCover,
        calculateCommission
    };
})();

// Export for use in other files
if(typeof module !== 'undefined' && module.exports) {
    module.exports = Books;
}
