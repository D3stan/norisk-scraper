/**
 * Sample test data for NoRisk automation
 * This data structure matches the expected Italian frontend format
 * 
 * samples 1, 2, and 3 combined MUST test all possibilities including:
 * - All roles (event_organiser, intermediary, proxy)
 * - Business vs Individual entities
 * - Complex coverages (Non-appearance guest lists, Conditional fields)
 * - Different event types and environments
 */

export const sampleRequest = {
    // VARIATION 1: Standard Event Organiser, Business, Basic Coverages
    // Personal Details
    initials: "M",
    preposition: "",
    lastName: "Rossi",
    phone: "+39 06 1234567",
    email: "mario.rossi@example.it",
    role: "event_organiser",
    
    // Event Details
    eventName: "Festival Estivo Roma 2026",
    eventType: "18", // Festival
    startDate: "2026-06-15",
    days: 3,
    visitors: 500,
    description: "Festival musicale all'aperto con concerti dal vivo",
    
    // Location
    venueDescription: "Parco pubblico nel centro città",
    address: "Via dei Fori Imperiali",
    houseNumber: "1",
    zipcode: "00186",
    city: "Roma",
    country: "it",
    environment: "outdoor",
    
    // Proposal page specific fields (Business)
    isBusiness: true, 
    companyName: "Festival Internazionale SRL",
    companyCommercialNumber: "12345678",
    companyDunsNumber: "987654321",
    companyLegalForm: "private_limited_company", // BV/Besloten vennootschap
    
    // Coverages - Basic Liability & Accident
    coverages: {
        liability: true,
        accident: true,
        
        // Sub-fields
        higher_liability: "2500000", // €2.5M
        accident_man_days: "50", 
        accident_man_days_participants: "50", 
    }
};

export const sampleRequest2 = {
    // VARIATION 2: Intermediary, Individual, Complex Non-Appearance & Money
    // Personal Details (Intermediary requires company & AFM)
    initials: "G",
    preposition: "",
    lastName: "Bianchi",
    phone: "+39 02 9876543",
    email: "giulia.bianchi@example.it",
    role: "intermediary",
    roleCompany: "Bianchi Events Agency",
    roleVerification: "AFM123456",
    
    // Event Details
    eventName: "Conferenza Tech Milano",
    eventType: "11", // Concert
    startDate: "2026-09-10",
    days: 2,
    visitors: 2000,
    description: "Grande concerto rock all'aperto",
    
    // Location
    venueDescription: "Stadio San Siro",
    address: "Piazzale Angelo Moratti",
    houseNumber: "1",
    zipcode: "20151",
    city: "Milano",
    country: "it",
    environment: "outdoor",
    
    // Proposal page specific fields (Individual)
    isBusiness: false,
    birthdate: "15-05-1985", // Required for individual
    
    coverages: {
        // Complex Cancellation: Non-appearance (requires guest list)
        cancellation_non_appearance: true,
        non_appearance_guests: [
            { name: "Rock Star 1", birthdate: "01-01-1990", artist: true },
            { name: "Guest Speaker", birthdate: "05-05-1980", artist: false }
        ],

        // Money coverage
        money: true,
        money_value: "5000",
        
        // Equipment coverage
        equipment: true,
        equipment_value: "50000",
    }
};

export const sampleRequest3 = {
    // VARIATION 3: Proxy, Foundation (Business), Income/Weather & Sport Accident
    // Personal Details (Proxy requires company & AFM)
    initials: "L",
    preposition: "De",
    lastName: "Luca",
    phone: "+39 081 5554321",
    email: "luca.deluca@example.it",
    role: "proxy",
    roleCompany: "De Luca Insurance",
    roleVerification: "AFM987654",
    
    // Event Details
    eventName: "Matrimonio Sara e Marco",
    eventType: "8", // Wedding
    startDate: "2026-07-20",
    days: 1,
    visitors: 150,
    description: "Celebrazione matrimonio con ricevimento",
    
    // Location
    venueDescription: "Villa storica con giardino",
    address: "Via Toledo",
    houseNumber: "55",
    zipcode: "80134",
    city: "Napoli",
    country: "it",
    environment: "both",
    
    // Proposal page specific fields (Business - Foundation)
    isBusiness: true,
    companyName: "Wedding Planner Foundation",
    companyCommercialNumber: "NA123456",
    companyLegalForm: "foundation", // Stichting
    
    coverages: {
        // Income & Weather
        cancellation_income: true,
        cancellation_income_estimate: "20000",
        cancellation_weather: true,
        
        // Accident with sport participants
        accident: true,
        accident_man_days: "10",
        accident_man_days_participants: "150",
        accident_man_days_participants_sport: true // Checkbox
    }
};
