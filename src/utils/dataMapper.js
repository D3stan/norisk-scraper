import logger from './logger.js';

/**
 * Normalizes country code to match backend expectations
 * Backend expects trailing space for most countries except 'us' and 'gb'
 */
export function normalizeCountryCode(code) {
  if (!code) return '';
  
  const lowerCode = code.toLowerCase();
  
  // Special cases without trailing space
  const noSpaceCodes = ['us', 'gb'];
  
  if (noSpaceCodes.includes(lowerCode)) {
    return lowerCode;
  }
  
  // Most countries need trailing space
  return `${lowerCode} `;
}

/**
 * Maps Italian form data to Dutch backend field structure
 */
export function mapFormData(italianData) {
  logger.debug('Mapping Italian form data to Dutch backend format', { 
    eventType: italianData.eventType,
    country: italianData.country 
  });
  
  const mapped = {
    // Personal Details
    initials: italianData.initials || '',
    preposition: italianData.preposition || '',
    last_name: italianData.lastName || '',
    phone: italianData.phone || '',
    email: italianData.email || '',
    role: italianData.role || 'event_organiser',
    
    // Event Details
    title: italianData.eventName || '',
    type: italianData.eventType || '',
    start: italianData.startDate || '', // Format: YYYY-MM-DD
    days: italianData.days || 1,
    visitors: italianData.visitors || 0,
    description: italianData.description || '',
    
    // Location
    venue_description: italianData.venueDescription || '',
    address: italianData.address || '',
    house_number: italianData.houseNumber || '',
    zipcode: italianData.zipcode || '',
    city: italianData.city || '',
    region: normalizeCountryCode(italianData.country),
    environment: italianData.environment || 'both',
    
    // Coverages (if provided)
    coverages: {
      liability: italianData.coverages?.liability ?? false,
      accidents: italianData.coverages?.accidents ?? false,
      equipment: italianData.coverages?.equipment ?? false,
      cancellation: italianData.coverages?.cancellation ?? false,
    }
  };
  
  logger.debug('Mapped data successfully', { 
    region: mapped.region,
    type: mapped.type 
  });
  
  return mapped;
}

/**
 * Validates required fields before submission
 */
export function validateFormData(data) {
  const requiredFields = [
    { field: 'email', message: 'Email is required' },
    { field: 'eventName', message: 'Event name is required' },
    { field: 'eventType', message: 'Event type is required' },
    { field: 'startDate', message: 'Start date is required' },
    { field: 'country', message: 'Country is required' },
  ];
  
  const errors = [];
  
  for (const { field, message } of requiredFields) {
    if (!data[field]) {
      errors.push(message);
    }
  }
  
  if (errors.length > 0) {
    logger.warn('Validation failed', { errors });
    return { valid: false, errors };
  }
  
  logger.debug('Validation passed');
  return { valid: true, errors: [] };
}
