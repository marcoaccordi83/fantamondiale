import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://syysfydwdaoztqdrqyzx.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5eXNmeWR3ZGFvenRxZHJxeXp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMjQwMzMsImV4cCI6MjA5NjYwMDAzM30.02he2fYNTOYkud_3A_EGzNqDtuJ8gBnz6YSaPrUEn5k'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
