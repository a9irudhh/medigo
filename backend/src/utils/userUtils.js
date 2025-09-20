/**
 * User utility functions - Pure functions that don't require database context
 */

/**
 * Generate a 6-digit verification token
 * @returns {string} 6-digit verification code
 */
export const generateVerificationToken = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Generate a secure random token for password reset
 * @returns {string} Random hex token
 */
export const generatePasswordResetToken = () => {
    return require('crypto').randomBytes(32).toString('hex');
};

/**
 * Calculate age from date of birth
 * @param {Date} dateOfBirth 
 * @returns {number|null} Age in years
 */
export const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return null;
    const today = new Date();
    let age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
        age--;
    }
    return age;
};

/**
 * Validate phone number format
 * @param {string} phone 
 * @returns {boolean} True if valid phone number
 */
export const isValidPhoneNumber = (phone) => {
    const phoneRegex = /^[+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone);
};

/**
 * Validate email format
 * @param {string} email 
 * @returns {boolean} True if valid email
 */
export const isValidEmail = (email) => {
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    return emailRegex.test(email);
};

/**
 * Get symptoms pattern from conversation history (for AI analysis)
 * @param {Array} conversationHistory 
 * @param {number} days - Number of days to look back (default: 30)
 * @returns {Object} Symptoms frequency map
 */
export const getRecentSymptomsPattern = (conversationHistory, days = 30) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return conversationHistory
        .filter(conversation => conversation.timestamp >= cutoffDate)
        .flatMap(conversation => conversation.symptoms)
        .reduce((acc, symptom) => {
            acc[symptom] = (acc[symptom] || 0) + 1;
            return acc;
        }, {});
};

/**
 * Format user's full name
 * @param {string} firstName 
 * @param {string} lastName 
 * @returns {string} Full name
 */
export const formatFullName = (firstName, lastName) => {
    return `${firstName} ${lastName}`.trim();
};
