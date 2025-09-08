const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Use hardcoded Supabase credentials (same as in src/lib/supabase.js)
const supabaseUrl = 'https://yxjvgbjafproaylausap.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4anZnYmphZnByb2F5bGF1c2FwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1OTE2MDgsImV4cCI6MjA3MjE2NzYwOH0.BGTkY6q-G3qy8--O0ehe0N4i_tVnEWpjlkz3RJgtWjQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    const migrationFile = process.argv[2];
    if (!migrationFile) {
      console.error('Please provide a migration file as an argument');
      console.error('Usage: node run_migration.js <migration_file.sql>');
      process.exit(1);
    }
    
    console.log(`Running migration: ${migrationFile}`);
    
    // Read the migration file
    const migrationSQL = fs.readFileSync(migrationFile, 'utf8');
    
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      console.error('Migration error:', error);
    } else {
      console.log('Migration completed successfully!');
    }
  } catch (error) {
    console.error('Error running migration:', error);
  }
}

runMigration();
