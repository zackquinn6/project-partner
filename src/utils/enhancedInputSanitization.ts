import { sanitizeInput, sanitizeFormData, generateCSRFToken, setCSRFToken, getCSRFToken, validateCSRFToken } from './inputSanitization';

/**
 * Enhanced input sanitization with additional security measures
 */

// Rate limiting for sensitive operations
const operationAttempts = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = {
  formSubmission: 20,
  roleModification: 5,
  dataExport: 3,
  bulkOperations: 10
};

/**
 * Check rate limit for operations
 */
export const checkOperationRateLimit = (operation: keyof typeof MAX_ATTEMPTS, identifier: string): boolean => {
  const now = Date.now();
  const key = `${operation}:${identifier}`;
  const attempts = operationAttempts.get(key) || [];
  
  // Remove attempts outside the window
  const recentAttempts = attempts.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW);
  
  // Update the map
  operationAttempts.set(key, recentAttempts);
  
  return recentAttempts.length < MAX_ATTEMPTS[operation];
};

/**
 * Record an operation attempt
 */
export const recordOperationAttempt = (operation: keyof typeof MAX_ATTEMPTS, identifier: string): void => {
  const key = `${operation}:${identifier}`;
  const attempts = operationAttempts.get(key) || [];
  attempts.push(Date.now());
  operationAttempts.set(key, attempts);
};

/**
 * Enhanced form data sanitization with additional validations
 */
export const enhancedSanitizeFormData = <T extends Record<string, any>>(data: T): T => {
  const sanitized = { ...sanitizeFormData(data) } as any;
  
  // Additional validations
  Object.keys(sanitized).forEach(key => {
    if (typeof sanitized[key] === 'string') {
      // Remove potentially dangerous patterns
      sanitized[key] = sanitized[key]
        .replace(/data:(?!image\/)/gi, '') // Remove data URIs except images
        .replace(/vbscript:/gi, '')        // Remove VBScript
        .replace(/mocha:/gi, '')           // Remove Mocha protocol
        .replace(/livescript:/gi, '')      // Remove LiveScript
        .trim();
      
      // Limit string length to prevent DoS
      if (sanitized[key].length > 10000) {
        sanitized[key] = sanitized[key].substring(0, 10000);
      }
    }
  });
  
  return sanitized as T;
};

/**
 * Validate numeric inputs with bounds checking
 */
export const sanitizeNumericInput = (value: number, min: number = 0, max: number = Number.MAX_SAFE_INTEGER): number => {
  if (typeof value !== 'number' || isNaN(value)) {
    return min;
  }
  
  return Math.max(min, Math.min(max, value));
};

/**
 * Validate email addresses
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const sanitizedEmail = sanitizeInput(email);
  return emailRegex.test(sanitizedEmail) && sanitizedEmail.length <= 254;
};

/**
 * Initialize CSRF protection for a session
 */
export const initializeCSRFProtection = (): string => {
  const token = generateCSRFToken();
  setCSRFToken(token);
  return token;
};

/**
 * Validate form submission with CSRF check
 */
export const validateFormSubmission = (csrfToken: string, userIdentifier: string): { isValid: boolean; error?: string } => {
  // Check CSRF token
  if (!validateCSRFToken(csrfToken)) {
    return { isValid: false, error: 'Invalid security token. Please refresh the page and try again.' };
  }
  
  // Check rate limiting
  if (!checkOperationRateLimit('formSubmission', userIdentifier)) {
    recordOperationAttempt('formSubmission', userIdentifier);
    return { isValid: false, error: 'Too many form submissions. Please wait before trying again.' };
  }
  
  // Record the attempt
  recordOperationAttempt('formSubmission', userIdentifier);
  
  return { isValid: true };
};

// Export existing functions for compatibility
export {
  sanitizeInput,
  sanitizeFormData,
  generateCSRFToken,
  setCSRFToken,
  getCSRFToken,
  validateCSRFToken
};