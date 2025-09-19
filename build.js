// This script runs during Netlify build to inject environment variables
const fs = require("fs");
const path = require("path");

// Read environment variables from Netlify
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Validate environment variables exist
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("ERROR: Missing required environment variables!");
  console.error(
    "Please set SUPABASE_URL and SUPABASE_ANON_KEY in Netlify dashboard"
  );
  process.exit(1);
}

// Create config.js with injected values and proper initialization
const configContent = `// Auto-generated during build - DO NOT EDIT
// Supabase Configuration

const SUPABASE_URL = '${SUPABASE_URL}';
const SUPABASE_ANON_KEY = '${SUPABASE_ANON_KEY}';

// Global supabase client variable
let supabase;

// Initialize Supabase client when the library is ready
(function initSupabase() {
  console.log('Attempting to initialize Supabase...');
  console.log('window.supabase available?', typeof window.supabase !== 'undefined');
  
  if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
    try {
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      console.log('✅ Supabase client initialized successfully');
      console.log('Supabase client:', supabase);
      
      // Test connection
      supabase.from('expenses').select('count').then(result => {
        console.log('Connection test result:', result);
      });
    } catch (error) {
      console.error('❌ Failed to create Supabase client:', error);
    }
  } else {
    console.log('Supabase library not ready yet, retrying...');
    setTimeout(initSupabase, 50);
  }
})();
`;

// Write the config file
fs.writeFileSync(path.join(__dirname, "config.js"), configContent);

console.log("✅ config.js generated successfully with environment variables");
