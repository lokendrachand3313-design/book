// ============================================
// KitabSansar - Authentication Module
// Handles seller sign in, sign up, and logout
// ============================================

const Auth = (function() {
    // Private variables
    let sellers = [];
    let currentSeller = null;
    
    // Storage keys
    const STORAGE_KEYS = {
        SELLERS: 'kitab_sellers',
        CURRENT_SELLER: 'kitab_current_seller'
    };
    
    // Load sellers from localStorage
    function loadSellers() {
        const stored = localStorage.getItem(STORAGE_KEYS.SELLERS);
        if(stored) {
            sellers = JSON.parse(stored);
        } else {
            // Default demo seller
            sellers = [{
                id: '1',
                firstName: 'Ram',
                lastName: 'Sharma',
                email: 'ram@example.com',
                mobile: '+9779812345678',
                city: 'Kathmandu',
                password: 'password123',
                totalCommissionPaid: 0,
                booksListed: 2,
                createdAt: Date.now()
            }];
            saveSellers();
        }
        return sellers;
    }
    
    // Save sellers to localStorage
    function saveSellers() {
        localStorage.setItem(STORAGE_KEYS.SELLERS, JSON.stringify(sellers));
    }
    
    // Save current seller session
    function saveCurrentSeller() {
        if(currentSeller) {
            localStorage.setItem(STORAGE_KEYS.CURRENT_SELLER, JSON.stringify(currentSeller));
        } else {
            localStorage.removeItem(STORAGE_KEYS.CURRENT_SELLER);
        }
    }
    
    // Load current seller session
    function loadCurrentSeller() {
        const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_SELLER);
        if(stored) {
            currentSeller = JSON.parse(stored);
            return currentSeller;
        }
        return null;
    }
    
    // Regular Sign Up
    function signUp(firstName, lastName, email, mobile, city, password) {
        // Validation
        if(!firstName || !email || !city || !password) {
            return { success: false, error: 'Please fill all required fields' };
        }
        
        // Check if email already exists
        if(sellers.find(s => s.email === email)) {
            return { success: false, error: 'Email already registered' };
        }
        
        // Check if mobile already exists (if provided)
        const fullMobile = mobile ? '+977' + mobile : '';
        if(mobile && sellers.find(s => s.mobile === fullMobile)) {
            return { success: false, error: 'Mobile number already registered' };
        }
        
        // Create new seller
        const newSeller = {
            id: Date.now().toString(),
            firstName: firstName.trim(),
            lastName: lastName ? lastName.trim() : '',
            email: email.trim(),
            mobile: fullMobile,
            city: city,
            password: password,
            totalCommissionPaid: 0,
            booksListed: 0,
            createdAt: Date.now()
        };
        
        sellers.push(newSeller);
        saveSellers();
        currentSeller = newSeller;
        saveCurrentSeller();
        
        return { success: true, seller: newSeller };
    }
    
    // Regular Sign In
    function signIn(identifier, password) {
        if(!identifier || !password) {
            return { success: false, error: 'Please enter email/mobile and password' };
        }
        
        // Check if identifier is mobile (10 digits) or email
        const isMobile = /^[0-9]{10}$/.test(identifier);
        const searchValue = isMobile ? '+977' + identifier : identifier;
        
        const seller = sellers.find(s => 
            (s.email === searchValue || s.mobile === searchValue) && s.password === password
        );
        
        if(seller) {
            currentSeller = seller;
            saveCurrentSeller();
            return { success: true, seller: seller };
        }
        
        return { success: false, error: 'Invalid email/mobile or password' };
    }
    
    // Google Sign Up/In
    function googleAuth(email) {
        if(!email || !email.includes('@')) {
            return { success: false, error: 'Please enter a valid Gmail address' };
        }
        
        let seller = sellers.find(s => s.email === email);
        
        if(!seller) {
            // Create new seller with Google
            seller = {
                id: Date.now().toString(),
                firstName: email.split('@')[0],
                lastName: '',
                email: email,
                mobile: '',
                city: '',
                password: '',
                provider: 'google',
                totalCommissionPaid: 0,
                booksListed: 0,
                createdAt: Date.now()
            };
            sellers.push(seller);
            saveSellers();
        }
        
        currentSeller = seller;
        saveCurrentSeller();
        return { success: true, seller: seller };
    }
    
    // Mobile Number Sign Up
    function mobileAuth(mobile) {
        if(!mobile || !/^[0-9]{10}$/.test(mobile)) {
            return { success: false, error: 'Please enter a valid 10-digit mobile number' };
        }
        
        const fullMobile = '+977' + mobile;
        let seller = sellers.find(s => s.mobile === fullMobile);
        
        if(!seller) {
            // Create new seller with mobile
            seller = {
                id: Date.now().toString(),
                firstName: 'MobileUser',
                lastName: '',
                email: '',
                mobile: fullMobile,
                city: '',
                password: '',
                provider: 'mobile',
                totalCommissionPaid: 0,
                booksListed: 0,
                createdAt: Date.now()
            };
            sellers.push(seller);
            saveSellers();
        }
        
        currentSeller = seller;
        saveCurrentSeller();
        return { success: true, seller: seller };
    }
    
    // Logout
    function logout() {
        currentSeller = null;
        saveCurrentSeller();
        return true;
    }
    
    // Get current seller
    function getCurrentSeller() {
        return currentSeller;
    }
    
    // Check if seller is logged in
    function isLoggedIn() {
        return currentSeller !== null;
    }
    
    // Update seller after commission payment
    function updateSellerCommission(amount) {
        if(currentSeller) {
            currentSeller.totalCommissionPaid = (currentSeller.totalCommissionPaid || 0) + amount;
            const index = sellers.findIndex(s => s.id === currentSeller.id);
            if(index !== -1) {
                sellers[index] = currentSeller;
                saveSellers();
                saveCurrentSeller();
            }
            return true;
        }
        return false;
    }
    
    // Get all sellers (for admin purposes)
    function getAllSellers() {
        return [...sellers];
    }
    
    // Public API
    return {
        loadSellers,
        loadCurrentSeller,
        signUp,
        signIn,
        googleAuth,
        mobileAuth,
        logout,
        getCurrentSeller,
        isLoggedIn,
        updateSellerCommission,
        getAllSellers
    };
})();

// Export for use in other files
if(typeof module !== 'undefined' && module.exports) {
    module.exports = Auth;
}
