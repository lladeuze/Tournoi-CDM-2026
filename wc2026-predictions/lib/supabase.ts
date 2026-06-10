import { createClient } from '@supabase/supabase-js';
import { createDemoClient } from './demoClient';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** True when Supabase keys are missing → run on local demo data (maquette mode). */
export const isDemoMode = !supabaseUrl || !supabaseAnonKey;

export const supabase = isDemoMode
  ? createDemoClient()
  : createClient(supabaseUrl!, supabaseAnonKey!);
