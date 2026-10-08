// عميل Supabase — يقرأ الإعدادات من متغيرات بيئة عامة (VITE_*) فقط، ولا يحتوي أي مفتاح سري.
// راجع .env.example لمعرفة المتغيرات المطلوبة، و CLAUDE.md لقاعدة عدم تضمين الأسرار في الكود.

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'متغيرات Supabase غير مضبوطة. انسخ .env.example إلى .env وعبّئ VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY.',
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
