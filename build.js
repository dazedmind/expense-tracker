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

// Create config.js with injected values
const configContent = `// Auto-generated during build - DO NOT EDIT
// Supabase Configuration
const SUPABASE_URL = '${SUPABASE_URL}';
const SUPABASE_ANON_KEY = '${SUPABASE_ANON_KEY}';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
`;

// Write the config file
fs.writeFileSync(path.join(__dirname, "config.js"), configContent);

console.log("✅ config.js generated successfully with environment variables");
