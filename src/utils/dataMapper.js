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
        // Personal Details (used in both page 1 and proposal page)
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
        
        // Location (used in both page 1 and proposal page)
        venue_description: italianData.venueDescription || '',
        address: italianData.address || '',
        house_number: italianData.houseNumber || '',
        zipcode: italianData.zipcode || '',
        city: italianData.city || '',
        // region: normalizeCountryCode(italianData.country),
        region: italianData.country || '',
        country: italianData.country || 'nl', // Country for proposal page
        environment: italianData.environment || 'both',
        
        // Proposal page specific fields
        is_business: italianData.isBusiness || false,
        company_name: italianData.companyName || '',
        company_commercial_number: italianData.companyCommercialNumber || '',
        company_duns_number: italianData.companyDunsNumber || '',
        company_legal_form: italianData.companyLegalForm || '',
        birthdate: italianData.birthdate || '',
        
        // Coverages (if provided)
        coverages: {
          // Pass through coverages as-is (using exact field names from form)
          ...(italianData.coverages || {})
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
