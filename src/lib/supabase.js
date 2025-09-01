import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://yxjvgbjafproaylausap.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4anZnYmphZnByb2F5bGF1c2FwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1OTE2MDgsImV4cCI6MjA3MjE2NzYwOH0.BGTkY6q-G3qy8--O0ehe0N4i_tVnEWpjlkz3RJgtWjQ'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
