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
 * Maps frontend accident man-days range string (e.g. "1-50", "none") to the
 * numeric value expected by the NoRisk select (e.g. "50", "0").
 * The NoRisk option value is always the upper bound of the range.
 */
function mapAccidentManDays(value) {
    if (!value || value === 'none') return '0';
    // value is like "1-50", "51-100", "4001-5000" – take the part after the last hyphen
    const parts = value.split('-');
    return parts[parts.length - 1];
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
        role_company: italianData.roleCompany || '',
        role_verification: italianData.roleVerification || '',
        
        // Event Details
        title: italianData.eventName || '',
        type: italianData.eventType || '',
        start: italianData.startDate || '', // Format: YYYY-MM-DD
        days: italianData.days || 1,
        visitors: italianData.visitors || 0,
        description: italianData.description || '',
        
        // Event location (page 1)
        venue_description: italianData.venueDescription || '',
        address: italianData.address || '',
        house_number: italianData.houseNumber || '',
        zipcode: italianData.zipcode || '',
        city: italianData.city || '',
        // region: normalizeCountryCode(italianData.country),
        region: italianData.country || '',
        // Country for proposal page - Flux UI expects trailing space for most countries
        // Prefer policyholder/company country when available
        country: normalizeCountryCode(italianData.company_country || italianData.companyCountry || italianData.country || 'nl'),
        environment: italianData.environment || 'both',

        // Policyholder address (Your Details page)
        policyholder_address: italianData.company_address || italianData.companyAddress || italianData.address || '',
        policyholder_house_number: italianData.company_house_number || italianData.companyHouseNumber || italianData.houseNumber || '',
        policyholder_zipcode: italianData.company_zipcode || italianData.companyZipcode || italianData.zipcode || '',
        policyholder_city: italianData.company_city || italianData.companyCity || italianData.city || '',
        
        // Proposal page specific fields
        is_business: italianData.isBusiness || false,
        company_name: italianData.company_name || italianData.companyName || '',
        company_commercial_number: italianData.company_commercial_number || italianData.companyCommercialNumber || '',
        company_duns_number: italianData.company_duns_number || italianData.companyDunsNumber || '',
        company_legal_form: italianData.company_legal_form || italianData.companyLegalForm || '',
        birthdate: italianData.birthdate || '',
        
        // Coverages (if provided)
        coverages: {
            // Pass through coverages, converting accident man-days range strings to
            // the numeric upper-bound values the NoRisk form expects.
            ...(italianData.coverages || {}),
            ...(italianData.coverages?.accident_man_days !== undefined && {
                accident_man_days: mapAccidentManDays(italianData.coverages.accident_man_days)
            }),
            ...(italianData.coverages?.accident_man_days_participants !== undefined && {
                accident_man_days_participants: mapAccidentManDays(italianData.coverages.accident_man_days_participants)
            })
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
    
    // Check role-specific required fields
    if (data.role === 'intermediary' || data.role === 'proxy') {
        if (!data.roleCompany) {
            errors.push('Company name is required for intermediary/proxy role');
        }
        if (!data.roleVerification) {
            errors.push('AFM/Verification number is required for intermediary/proxy role');
        }
    }
    
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
