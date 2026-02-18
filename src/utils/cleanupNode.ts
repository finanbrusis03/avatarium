import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dddrqsdlqftynceifxld.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkZHJxc2RscWZ0eW5jZWlmeGxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNjI1NTMsImV4cCI6MjA4NjkzODU1M30.8hN1UR3MNOOtl1pyakTiGVug3MRsPVu1Rre-wQiJPMY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function cleanup() {
    console.log('Fetching avatars...');
    const { data: avatars, error } = await supabase.from('creatures').select('*');

    if (error) {
        console.error('Error fetching:', error);
        return;
    }

    const keep = '@criszimn';
    let count = 0;

    for (const avatar of avatars) {
        if (avatar.name.toLowerCase() !== keep.toLowerCase()) {
            console.log(`Deleting ${avatar.name}...`);
            await supabase.from('creatures').delete().eq('id', avatar.id);
            count++;
        }
    }
    console.log(`Cleanup complete. Deleted ${count} avatars.`);
}

cleanup();
