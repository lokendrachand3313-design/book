// ============================================
// KitabSansar - Main Application
// Initializes and coordinates all modules
// ============================================

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    
    // DOM Elements
    const elements = {
        // User display
        sellerInfoSection: document.getElementById('sellerInfoSection'),
        buyerInfoSection: document.getElementById('buyerInfoSection'),
        sellerNameDisplay: document.getElementById('sellerNameDisplay'),
        sellerCityDisplay: document.getElementById('sellerCityDisplay'),
        sellerAvatar: document.getElementById('sellerAvatar'),
        showSellerAuthBtn: document.getElementById('showSellerAuthBtn'),
        logoutBtn: document.getElementById('logoutBtn'),
        
        // Navigation
        navTabs: document.querySelectorAll('.nav-tab'),
        buyerPage: document.getElementById('buyerPage'),
        sellerPage: document.getElementById('sellerPage'),
        sellerProfileContent: document.getElementById('sellerProfileContent'),
        
        // Search
        searchInput: document.getElementById('searchInput'),
        searchBtn: document.getElementById('searchBtn'),
        
        // Books grid
        booksGrid: document.getElementById('booksGrid'),
        bookCountBadge: document.getElementById('bookCountBadge'),
        
        // Chat
        chatBookSelect: document.getElementById('chatBookSelect'),
        chatMessagesContainer: document.getElementById('chatMessagesContainer'),
        chatInput: document.getElementById('chatInput'),
        sendChatBtn: document.getElementById('sendChatBtn'),
        currentChatBook: document.getElementById('currentChatBook'),
        
        // Modals
        sellerAuthModal: document.getElementById('sellerAuthModal'),
        sellModal: document.getElementById('sellModal'),
        commissionModal: document.getElementById('commissionModal'),
        
        // Auth form
        signinEmail: document.getElementById('signinEmail'),
        signinPassword: document.getElementById('signinPassword'),
        signinBtn: document.getElementById('signinBtn'),
        googleAuthBtn: document.getElementById('googleAuthBtn'),
        mobileSignupBtn: document.getElementById('mobileSignupBtn'),
        closeSellerAuthModalBtn: document.getElementById('closeSellerAuthModalBtn'),
        
        // Sell form
        sellBookForm: document.getElementById('sellBookForm'),
        bookTitle: document.getElementById('bookTitle'),
        bookAuthor: document.getElementById('bookAuthor'),
        bookPrice: document.getElementById('bookPrice'),
        bookDesc: document.getElementById('bookDesc'),
        bookCategory: document.getElementById('bookCategory'),
        bookImageInput: document.getElementById('bookImageInput'),
        imagePreviewContainer: document.getElementById('imagePreviewContainer'),
        closeSellModalBtn: document.getElementById('closeSellModalBtn'),
        
        // Commission modal
        commissionDetails: document.getElementById('commissionDetails'),
        qrCodeImage: document.getElementById('qrCodeImage'),
        downloadQRBtn: document.getElementById('downloadQRBtn'),
        confirmCommissionPaymentBtn: document.getElementById('confirmCommissionPaymentBtn'),
        closeCommissionModalBtn: document.getElementById('closeCommissionModalBtn')
    };
    
    // State
    let selectedImage = null;
    let pendingSaleBook = null;
    let currentSearchQuery = '';
    
    // ========== UI Update Functions ==========
    
    function updateUI() {
        const isLoggedIn = Auth.isLoggedIn();
        const currentSeller = Auth.getCurrentSeller();
        
        if(isLoggedIn && currentSeller) {
            elements.sellerInfoSection.style.display = 'flex';
            elements.buyerInfoSection.style.display = 'none';
            elements.sellerNameDisplay.innerText = `${currentSeller.firstName || ''} ${currentSeller.lastName || ''}`.trim() || currentSeller.email;
            elements.sellerCityDisplay.innerText = currentSeller.city ? `📍 ${currentSeller.city}` : '';
            elements.sellerAvatar.innerHTML = (currentSeller.firstName ? currentSeller.firstName.charAt(0) : '📖').toUpperCase();
            renderSellerProfile();
        } else {
            elements.sellerInfoSection.style.display = 'none';
            elements.buyerInfoSection.style.display = 'flex';
            elements.sellerProfileContent.innerHTML = `
                <div class="profile-card" style="text-align:center; padding:3rem;">
                    <i class="fas fa-store" style="font-size:3rem;"></i>
                    <p style="margin-top:1rem;">Please login as a seller to view your dashboard</p>
                    <button class="btn btn-primary" id="loginPromptBtn">Login as Seller</button>
                </div>
            `;
            const loginBtn = document.getElementById('loginPromptBtn');
            if(loginBtn) loginBtn.onclick = () => showAuthModal();
        }
        renderBooks();
        updateChatSelect();
    }
    
    // ========== Book Rendering ==========
    
    function renderBooks() {
        let filteredBooks = Books.getAvailableBooks();
        
        if(currentSearchQuery) {
            filteredBooks = Books.searchBooks(currentSearchQuery);
        }
        
        elements.bookCountBadge.innerText = filteredBooks.length;
        
        if(filteredBooks.length === 0) {
            elements.booksGrid.innerHTML = '<div class="no-results">No books found</div>';
            return;
        }
        
        const isLoggedIn = Auth.isLoggedIn();
        
        elements.booksGrid.innerHTML = filteredBooks.map(book => `
            <div class="book-card">
                <img class="book-image" src="${escapeHtml(book.imageDataUrl || Books.getDefaultCover())}" alt="cover">
                <div class="book-info">
                    <div class="book-title">
                        📘 ${escapeHtml(book.title)}
                        <span class="commission-badge">10% Commission</span>
                    </div>
                    <div class="book-author">✍️ ${escapeHtml(book.author || 'Unknown Author')}</div>
                    <div class="book-price">💰 ${escapeHtml(book.price)}</div>
                    <div class="book-seller"><i class="fas fa-store"></i> Seller: ${escapeHtml(book.seller)}</div>
                    <div class="book-desc" style="font-size:0.8rem; margin:8px 0;">${escapeHtml(book.description || 'Good condition')}</div>
                    <div class="card-actions">
                        <button class="btn btn-primary btn-sm interest-btn" data-id="${book.id}" data-title="${escapeHtml(book.title)}" data-seller="${escapeHtml(book.seller)}">
                            <i class="fas fa-hands-helping"></i> I'm interested
                        </button>
                        <button class="btn btn-outline btn-sm chat-btn" data-id="${book.id}">
                            <i class="fas fa-comment"></i> Ask Question
                        </button>
                    </div>
                    <div class="interest-badge"><i class="fas fa-heart"></i> ${book.interestCount || 0} interested</div>
                </div>
            </div>
        `).join('');
        
        // Attach event listeners
        document.querySelectorAll('.interest-btn').forEach(btn => {
            btn.onclick = () => sendInterestRequest(btn.dataset.id, btn.dataset.title, btn.dataset.seller);
        });
        
        document.querySelectorAll('.chat-btn').forEach(btn => {
            btn.onclick = () => loadChatForBook(btn.dataset.id);
        });
    }
    
    function renderSellerProfile() {
        const currentSeller = Auth.getCurrentSeller();
        if(!currentSeller) return;
        
        const sellerBooks = Books.getBooksBySeller(currentSeller.id);
        const totalCommission = currentSeller.totalCommissionPaid || 0;
        
        elements.sellerProfileContent.innerHTML = `
            <div class="profile-card">
                <div class="profile-header">
                    <div class="profile-avatar">${currentSeller.firstName ? currentSeller.firstName.charAt(0) : '📖'}</div>
                    <div class="profile-info">
                        <h2>${currentSeller.firstName} ${currentSeller.lastName || ''}</h2>
                        <p><i class="fas fa-envelope"></i> ${currentSeller.email}</p>
                        <p><i class="fas fa-map-marker-alt"></i> ${currentSeller.city || 'Not specified'}</p>
                    </div>
                </div>
                <div class="profile-stats">
                    <div class="stat-card"><div class="stat-number">${sellerBooks.length}</div><div>Books Listed</div></div>
                    <div class="stat-card"><div class="stat-number">${sellerBooks.filter(b => b.isSold).length}</div><div>Books Sold</div></div>
                    <div class="stat-card"><div class="stat-number">रू ${totalCommission}</div><div>Commission Paid</div></div>
                </div>
                <button class="btn btn-primary" id="quickAddSellerBtn"><i class="fas fa-plus"></i> List New Book</button>
            </div>
            <div class="section-title" style="color:#ffd966; margin-top:1.5rem;">
                <i class="fas fa-book"></i> My Books for Sale
            </div>
            <div class="seller-books-grid" id="sellerBooksGrid">
                ${sellerBooks.map(book => `
                    <div class="seller-book-card">
                        <img class="seller-book-image" src="${book.imageDataUrl || Books.getDefaultCover()}" alt="${book.title}">
                        <div class="seller-book-info">
                            <h4>${escapeHtml(book.title)}</h4>
                            <p class="book-price" style="font-size:1rem; display:inline-block;">💰 ${book.price}</p>
                            <p style="font-size:0.8rem; margin-top:5px;">${book.description || 'No description'}</p>
                            ${!book.isSold ? 
                                `<button class="btn btn-success btn-sm mark-sold-from-profile" data-id="${book.id}" data-price="${book.priceRaw}">
                                    <i class="fas fa-tag"></i> Mark as Sold & Pay Commission
                                </button>` : 
                                '<span class="sold-badge" style="background:#28a745; color:white; padding:5px; border-radius:20px; display:inline-block;">✓ Sold</span>'
                            }
                        </div>
                    </div>
                `).join('')}
                ${sellerBooks.length === 0 ? '<div class="no-results">You haven\'t listed any books yet. Click "List New Book" to start selling!</div>' : ''}
            </div>
        `;
        
        const quickAddBtn = document.getElementById('quickAddSellerBtn');
        if(quickAddBtn) quickAddBtn.onclick = () => elements.sellModal.style.display = 'flex';
        
        document.querySelectorAll('.mark-sold-from-profile').forEach(btn => {
            btn.onclick = () => {
                const book = Books.getBookById(btn.dataset.id);
                if(book && !book.isSold) markAsSold(book);
            };
        });
    }
    
    // ========== Chat Functions ==========
    
    function updateChatSelect() {
        const availableBooks = Books.getAvailableBooks();
        elements.chatBookSelect.innerHTML = '<option value="">🌸 Choose a book to inquire</option>' + 
            availableBooks.map(book => `<option value="${book.id}">📙 ${escapeHtml(book.title)} - ${escapeHtml(book.seller)}</option>`).join('');
        
        elements.chatBookSelect.onchange = () => {
            if(elements.chatBookSelect.value) {
                loadChatForBook(elements.chatBookSelect.value);
            }
        };
    }
    
    function loadChatForBook(bookId) {
        const book = Books.getBookById(bookId);
        if(!book) return;
        
        Chat.setCurrentChat(bookId);
        const messages = Chat.getMessages(bookId);
        
        elements.currentChatBook.innerHTML = `<i class="fas fa-book"></i> Chatting about: ${escapeHtml(book.title)}`;
        elements.chatInput.disabled = false;
        elements.sendChatBtn.disabled = false;
        elements.chatInput.placeholder = `Ask about "${book.title}"...`;
        
        if(messages.length === 0) {
            elements.chatMessagesContainer.innerHTML = `<div style="text-align:center; padding:20px;">💬 No messages yet. Start the conversation with ${escapeHtml(book.seller)}!</div>`;
        } else {
            elements.chatMessagesContainer.innerHTML = messages.map(msg => `
                <div class="chat-bubble ${msg.senderName === 'Buyer' ? 'sent' : ''}">
                    <div class="chat-meta"><strong>${escapeHtml(msg.senderName)}</strong> · ${Chat.formatTime(msg.timestamp)}</div>
                    <div>${escapeHtml(msg.text)}</div>
                </div>
            `).join('');
            elements.chatMessagesContainer.scrollTop = elements.chatMessagesContainer.scrollHeight;
        }
    }
    
    function sendChatMessage() {
        const msg = elements.chatInput.value.trim();
        const currentChatId = Chat.getCurrentChat();
        
        if(!currentChatId || !msg) return;
        
        const currentSeller = Auth.getCurrentSeller();
        const senderName = currentSeller ? `Seller: ${currentSeller.firstName}` : 'Buyer';
        
        Chat.sendMessage(currentChatId, senderName, msg);
        loadChatForBook(currentChatId);
        elements.chatInput.value = '';
    }
    
    function sendInterestRequest(bookId, bookTitle, sellerName) {
        alert(`📩 Interest sent to seller: ${sellerName}\n\nYou can now chat with them in the chat box!`);
        
        Chat.sendMessage(bookId, 'Buyer', `💌 I'm interested in "${bookTitle}"! Please let me know more details.`);
        Books.incrementInterest(bookId);
        loadChatForBook(bookId);
        
        // Update book display
        renderBooks();
    }
    
    // ========== Selling Functions ==========
    
    function markAsSold(book) {
        if(book.isSold) {
            alert('Book already sold!');
            return;
        }
        
        const result = Books.markAsSold(book.id);
        if(result.success) {
            pendingSaleBook = result.book;
            const commission = Books.calculateCommission(book.priceRaw);
            
            elements.commissionDetails.innerHTML = `
                <div class="commission-box">
                    <p><strong>${escapeHtml(book.title)}</strong></p>
                    <p>Price: ${book.price}</p>
                    <p><strong>Commission (10%): रू ${commission}</strong></p>
                </div>
            `;
            elements.commissionModal.style.display = 'flex';
        }
    }
    
    function confirmCommissionAndRemove() {
        if(pendingSaleBook) {
            const commission = Books.calculateCommission(pendingSaleBook.priceRaw);
            
            // Update seller's commission paid
            Auth.updateSellerCommission(commission);
            
            // Confirm sale and remove book
            Books.confirmSale(pendingSaleBook.id);
            
            // Add system message to chat
            Chat.addSystemMessage(pendingSaleBook.id, `✅ This book has been sold! Commission of रू ${commission} paid.`);
            
            elements.commissionModal.style.display = 'none';
            pendingSaleBook = null;
            
            // Refresh UI
            renderBooks();
            if(Auth.isLoggedIn()) renderSellerProfile();
            updateChatSelect();
            
            alert(`✅ Book sold! Commission of रू ${commission} paid successfully.\n\nBook removed from listings.`);
        }
    }
    
    function downloadQR() {
        const link = document.createElement('a');
        link.download = 'kitabsansar_commission_qr.png';
        link.href = elements.qrCodeImage.src;
        link.click();
    }
    
    function addNewBook(title, author, price, description, category, imageDataUrl) {
        const currentSeller = Auth.getCurrentSeller();
        if(!currentSeller) {
            alert('Please sign in as seller');
            return false;
        }
        
        const sellerName = `${currentSeller.firstName} ${currentSeller.lastName}`.trim() || currentSeller.email;
        const result = Books.addBook(title, author, price, description, category, imageDataUrl, currentSeller.id, sellerName);
        
        if(result.success) {
            renderBooks();
            if(Auth.isLoggedIn()) renderSellerProfile();
            updateChatSelect();
            return true;
        }
        return false;
    }
    
    // ========== Auth Functions ==========
    
    function showAuthModal() {
        elements.sellerAuthModal.style.display = 'flex';
    }
    
    function closeAuthModal() {
        elements.sellerAuthModal.style.display = 'none';
    }
    
    function handleSignIn() {
        const email = elements.signinEmail.value;
        const password = elements.signinPassword.value;
        const result = Auth.signIn(email, password);
        
        if(result.success) {
            closeAuthModal();
            updateUI();
            alert(`Welcome back, ${result.seller.firstName}!`);
        } else {
            alert(result.error || 'Invalid credentials');
        }
    }
    
    function handleGoogleAuth() {
        const email = prompt('Enter your Gmail address:');
        if(email) {
            const result = Auth.googleAuth(email);
            if(result.success) {
                closeAuthModal();
                updateUI();
                alert(`Welcome, ${result.seller.firstName}!`);
            } else {
                alert(result.error);
            }
        }
    }
    
    function handleMobileAuth() {
        const mobile = prompt('Enter your mobile number (without +977, e.g., 9812345678):');
        if(mobile) {
            const result = Auth.mobileAuth(mobile);
            if(result.success) {
                closeAuthModal();
                updateUI();
                alert(`Welcome! Your account has been created.`);
            } else {
                alert(result.error);
            }
        }
    }
    
    function handleLogout() {
        Auth.logout();
        updateUI();
        alert('Logged out successfully');
    }
    
    // ========== Search Functions ==========
    
    function handleSearch() {
        currentSearchQuery = elements.searchInput.value;
        renderBooks();
    }
    
    // ========== Modal Handlers ==========
    
    function closeSellModal() {
        elements.sellModal.style.display = 'none';
        elements.sellBookForm.reset();
        selectedImage = null;
        elements.imagePreviewContainer.innerHTML = '';
    }
    
    function handleImageUpload(e) {
        const file = e.target.files[0];
        if(file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                selectedImage = ev.target.result;
                elements.imagePreviewContainer.innerHTML = `<img src="${selectedImage}" style="width:60px;height:60px;border-radius:12px;object-fit:cover;">`;
            };
            reader.readAsDataURL(file);
        }
    }
    
    function handleSellSubmit(e) {
        e.preventDefault();
        const title = elements.bookTitle.value;
        const price = elements.bookPrice.value;
        
        if(!title || !price) {
            alert('Please enter book title and price');
            return;
        }
        
        addNewBook(
            title,
            elements.bookAuthor.value,
            price,
            elements.bookDesc.value,
            elements.bookCategory.value,
            selectedImage
        );
        
        closeSellModal();
        alert('✅ Book listed successfully!');
    }
    
    // ========== Navigation ==========
    
    function initNavigation() {
        elements.navTabs.forEach(tab => {
            tab.onclick
