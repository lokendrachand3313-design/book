// ============================================
// KitabSansar - Chat Module
// Handles book-specific conversations
// ============================================

const Chat = (function() {
    // Private variables
    let messages = {};
    let currentChatBookId = null;
    
    // Storage key
    const STORAGE_KEY = 'kitab_messages';
    
    // Load messages from localStorage
    function loadMessages() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if(stored) {
            messages = JSON.parse(stored);
        } else {
            messages = {};
            // Add sample messages for demo books
            messages['1'] = [
                {
                    senderName: 'Ram Sharma',
                    text: 'Welcome! This book is in excellent condition. Let me know if you have any questions.',
                    timestamp: Date.now() - 3600000
                }
            ];
            messages['2'] = [
                {
                    senderName: 'Ram Sharma',
                    text: 'This is a great textbook. Perfect for BSc Physics students.',
                    timestamp: Date.now() - 7200000
                }
            ];
            saveMessages();
        }
        return messages;
    }
    
    // Save messages to localStorage
    function saveMessages() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
    
    // Get messages for a specific book
    function getMessages(bookId) {
        return messages[bookId] || [];
    }
    
    // Send a message
    function sendMessage(bookId, senderName, text) {
        if(!bookId || !text.trim()) {
            return false;
        }
        
        if(!messages[bookId]) {
            messages[bookId] = [];
        }
        
        const newMessage = {
            senderName: senderName,
            text: text.trim(),
            timestamp: Date.now()
        };
        
        messages[bookId].push(newMessage);
        saveMessages();
        
        // If this is the current chat, return the new message for UI update
        if(currentChatBookId === bookId) {
            return newMessage;
        }
        return true;
    }
    
    // Set current chat book
    function setCurrentChat(bookId) {
        currentChatBookId = bookId;
        return getMessages(bookId);
    }
    
    // Get current chat book ID
    function getCurrentChat() {
        return currentChatBookId;
    }
    
    // Clear messages for a book (admin function)
    function clearMessages(bookId) {
        if(messages[bookId]) {
            delete messages[bookId];
            saveMessages();
            return true;
        }
        return false;
    }
    
    // Add system message (e.g., for commission paid, interest)
    function addSystemMessage(bookId, text) {
        if(!messages[bookId]) {
            messages[bookId] = [];
        }
        
        messages[bookId].push({
            senderName: '📢 System',
            text: text,
            timestamp: Date.now(),
            isSystem: true
        });
        saveMessages();
        return true;
    }
    
    // Get all messages (for backup)
    function getAllMessages() {
        return { ...messages };
    }
    
    // Format timestamp
    function formatTime(timestamp) {
        return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Public API
    return {
        loadMessages,
        saveMessages,
        getMessages,
        sendMessage,
        setCurrentChat,
        getCurrentChat,
        clearMessages,
        addSystemMessage,
        getAllMessages,
        formatTime
    };
})();

// Export for use in other files
if(typeof module !== 'undefined' && module.exports) {
    module.exports = Chat;
}
