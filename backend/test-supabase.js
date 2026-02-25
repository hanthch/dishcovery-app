require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  console.log('URL:', process.env.SUPABASE_URL);
  console.log('Key starts with:', process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 20));
  
  const { data, error } = await supabase
    .from('restaurants')
    .select('id, name')
    .limit(1);

  console.log('Data:', data);
  console.log('Error:', error);
}

test();