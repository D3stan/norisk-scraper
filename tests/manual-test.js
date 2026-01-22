/**
 * Manual test script to test the automation without running the Express server
 * Usage: node tests/manual-test.js
 */

import dotenv from 'dotenv';
import { mapFormData } from '../src/utils/dataMapper.js';
import { automateFormSubmission } from '../src/automation/scraper.js';
import { sampleRequest, sampleRequest2, sampleRequest3 } from './sample-data.js';
import logger from '../src/utils/logger.js';

// Load environment variables
dotenv.config();

async function runTest() {
  console.log('\n🧪 Starting manual test of NoRisk automation\n');
  
  // Select which test data to use
  const testData = sampleRequest; // Change to sampleRequest2 or sampleRequest3 to test others
  
  logger.info('Test data selected', { 
    eventName: testData.eventName,
    eventType: testData.eventType,
    country: testData.country 
  });
  
  try {
    // Map the data
    const mappedData = mapFormData(testData);
    logger.info('Data mapped successfully');
    
    // Run automation
    console.log('\n⏳ Running automation (this may take 30-60 seconds)...\n');
    const result = await automateFormSubmission(mappedData);
    
    if (result.success) {
      console.log('\n✅ Test completed successfully!\n');
      console.log('📊 Results:');
      console.log('  - Quote Key:', result.quoteKey);
      console.log('  - Proposal URL:', result.proposalUrl);
      console.log('  - HTML Length:', result.htmlContent.length, 'characters');
      console.log('  - CSRF Token:', result.csrfToken.substring(0, 15) + '...');
      
      // Save HTML to file for inspection
      const fs = await import('fs');
      const path = await import('path');
      const { fileURLToPath } = await import('url');
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      
      const outputPath = path.join(__dirname, '..', 'proposal-output.html');
      fs.writeFileSync(outputPath, result.htmlContent);
      console.log('  - HTML saved to:', outputPath);
      
      console.log('\n✨ Check the screenshots/ folder for visual evidence\n');
    } else {
      console.log('\n❌ Test failed!\n');
      console.log('Error:', result.error);
      console.log('\n📸 Check the screenshots/ folder for error state\n');
    }
    
  } catch (error) {
    console.error('\n❌ Test crashed with exception:\n');
    console.error(error);
  }
  
  process.exit(0);
}

// Run the test
runTest();
