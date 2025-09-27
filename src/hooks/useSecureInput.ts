import { useCallback, useRef } from 'react';
import { sanitizeInput, validateEmail } from '@/utils/enhancedInputSanitization';
import { useSecurityMonitoring } from './useSecurityMonitoring';

interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  customValidator?: (value: string) => string | null;
}

interface ValidationRules {
  [key: string]: ValidationRule;
}

interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  sanitizedData: Record<string, string>;
}

export const useSecureInput = () => {
  const { logSecurityViolation } = useSecurityMonitoring();
  const formStartTimeRef = useRef<number>();
  const fieldCountRef = useRef<number>(0);

  const startFormTracking = useCallback(() => {
    formStartTimeRef.current = Date.now();
    fieldCountRef.current = 0;
  }, []);

  const validateAndSanitize = useCallback((
    data: Record<string, string>,
    rules: ValidationRules
  ): ValidationResult => {
    const errors: Record<string, string> = {};
    const sanitizedData: Record<string, string> = {};
    let isValid = true;

    fieldCountRef.current = Object.keys(data).length;

    // Check for suspicious field count
    if (fieldCountRef.current > 20) {
      logSecurityViolation(
        'excessive_form_fields',
        `Form contains ${fieldCountRef.current} fields, potential automated attack`,
        'medium',
        { fieldCount: fieldCountRef.current, fields: Object.keys(data) }
      );
    }

    Object.entries(data).forEach(([key, value]) => {
      const rule = rules[key];
      if (!rule) {
        sanitizedData[key] = sanitizeInput(value);
        return;
      }

      // Sanitize input first
      const sanitizedValue = sanitizeInput(value);
      sanitizedData[key] = sanitizedValue;

      // Check required fields
      if (rule.required && (!sanitizedValue || sanitizedValue.trim() === '')) {
        errors[key] = `${key} is required`;
        isValid = false;
        return;
      }

      // Skip further validation if field is empty and not required
      if (!sanitizedValue && !rule.required) {
        return;
      }

      // Length validation
      if (rule.minLength && sanitizedValue.length < rule.minLength) {
        errors[key] = `${key} must be at least ${rule.minLength} characters`;
        isValid = false;
      }

      if (rule.maxLength && sanitizedValue.length > rule.maxLength) {
        errors[key] = `${key} must be no more than ${rule.maxLength} characters`;
        isValid = false;
        
        // Log potential attack
        if (sanitizedValue.length > rule.maxLength * 2) {
          logSecurityViolation(
            'excessive_input_length',
            `Field ${key} contains ${sanitizedValue.length} characters, potential buffer overflow attempt`,
            'high',
            { field: key, length: sanitizedValue.length, maxAllowed: rule.maxLength }
          );
        }
      }

      // Pattern validation
      if (rule.pattern && !rule.pattern.test(sanitizedValue)) {
        errors[key] = `${key} format is invalid`;
        isValid = false;
        
        // Log potential injection attempt
        if (sanitizedValue.includes('<script') || sanitizedValue.includes('javascript:') || sanitizedValue.includes('data:')) {
          logSecurityViolation(
            'potential_xss_attempt',
            `Field ${key} contains suspicious content: ${sanitizedValue.substring(0, 100)}`,
            'high',
            { field: key, suspiciousContent: sanitizedValue.substring(0, 200) }
          );
        }
      }

      // Email specific validation
      if (key.toLowerCase().includes('email') && sanitizedValue) {
        if (!validateEmail(sanitizedValue)) {
          errors[key] = 'Invalid email format';
          isValid = false;
        }
      }

      // Custom validation
      if (rule.customValidator) {
        const customError = rule.customValidator(sanitizedValue);
        if (customError) {
          errors[key] = customError;
          isValid = false;
        }
      }
    });

    return { isValid, errors, sanitizedData };
  }, [logSecurityViolation]);

  const trackFormSubmission = useCallback((formType: string) => {
    if (!formStartTimeRef.current) return;
    
    const submissionTime = Date.now() - formStartTimeRef.current;
    
    // Log suspicious timing
    if (submissionTime < 1000) {
      logSecurityViolation(
        'suspicious_form_timing',
        `Form ${formType} submitted in ${submissionTime}ms, potential automation`,
        'medium',
        { formType, submissionTime, fieldCount: fieldCountRef.current }
      );
    }

    return submissionTime;
  }, [logSecurityViolation]);

  // Common validation rules
  const commonRules = {
    email: {
      required: true,
      maxLength: 254,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },
    password: {
      required: true,
      minLength: 8,
      maxLength: 128,
      customValidator: (value: string) => {
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
          return 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
        }
        return null;
      }
    },
    name: {
      required: true,
      minLength: 1,
      maxLength: 100,
      pattern: /^[a-zA-Z\s\-'\.]+$/
    },
    phone: {
      maxLength: 20,
      pattern: /^[\+]?[1-9][\d]{0,15}$/
    },
    url: {
      maxLength: 2048,
      pattern: /^https?:\/\/.+/
    }
  };

  return {
    validateAndSanitize,
    startFormTracking,
    trackFormSubmission,
    commonRules
  };
};