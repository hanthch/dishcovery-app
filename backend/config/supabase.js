const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://yxlcrdnkoojjcoxqitza.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'sb_secret_SuzOwKewQTHfn33KVUERHw_JUbS7qQ-';

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;