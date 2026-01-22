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
  
  // Coverages
  coverages: {
    liability: true,
    accidents: true,
    equipment: false,
    cancellation: false
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
    liability: true,
    accidents: false,
    equipment: true,
    cancellation: true
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
