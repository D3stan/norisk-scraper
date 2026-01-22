/**
 * Sample test data for NoRisk automation
 * This data structure matches the expected Italian frontend format
 */

export const sampleRequest = {
  // Personal Details
  initials: "M",
  preposition: "",
  lastName: "Rossi",
  phone: "+39 06 1234567",
  email: "mario.rossi@example.it",
  role: "event_organiser",
  
  // Event Details
  eventName: "Festival Estivo Roma 2026",
  eventType: "18", // Festival (from metadata.js)
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
  country: "it", // Will be normalized to "it " by dataMapper
  environment: "outdoor",
  
  // Proposal page specific fields
  isBusiness: true, // Testing business entity
  companyName: "Festival Internazionale SRL",
  companyCommercialNumber: "12345678",
  companyDunsNumber: "987654321",
  companyLegalForm: "52", // BV (from legal form dropdown)
  // birthdate not needed for business
  
  // Coverages - using exact field names from form
  coverages: {
    // Basic coverages (checkboxes)
    liability: true,
    accident: true,
    
    // Sub-fields for selected coverages
    higher_liability: "2500000", // €2.5M or €5M
    accident_man_days: "50", // Employees in man-days
    accident_man_days_participants: "", // No participants coverage
  }
};

export const sampleRequest2 = {
  initials: "G",
  preposition: "",
  lastName: "Bianchi",
  phone: "+39 02 9876543",
  email: "giulia.bianchi@example.it",
  role: "event_organiser",
  
  eventName: "Conferenza Tech Milano",
  eventType: "12", // Conference
  startDate: "2026-09-10",
  days: 2,
  visitors: 200,
  description: "Conferenza tecnologica con speaker internazionali",
  
  venueDescription: "Centro congressi moderno",
  address: "Piazza Duomo",
  houseNumber: "5",
  zipcode: "20121",
  city: "Milano",
  country: "it",
  environment: "indoor",
  
  coverages: {
    // Equipment and cancellation coverages
    equipment: true,
    cancellation_costs: true,
    
    // Sub-fields
    equipment_value: "50000", // €50,000 in equipment
    budget: "100000", // €100,000 total event cost
  }
};

export const sampleRequest3 = {
  initials: "L",
  preposition: "De",
  lastName: "Luca",
  phone: "+39 081 5554321",
  email: "luca.deluca@example.it",
  role: "event_organiser",
  
  eventName: "Matrimonio Sara e Marco",
  eventType: "8", // Wedding
  startDate: "2026-07-20",
  days: 1,
  visitors: 150,
  description: "Celebrazione matrimonio con ricevimento",
  
  venueDescription: "Villa storica con giardino",
  address: "Via Toledo",
  houseNumber: "55",
  zipcode: "80134",
  city: "Napoli",
  country: "it",
  environment: "both",
  
  coverages: {
    liability: true,
    accidents: true,
    equipment: true,
    cancellation: true
  }
};
