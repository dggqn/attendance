// 引入数据库客户端sdk
import { createClient } from '@supabase/supabase-js';
// 配置url和key
const supabaseUrl = 'https://xsaoruoxvcawalfauton.supabase.co'
const supabaseKey = 'sb_publishable_kcFwQMFDtc8VHZZheHzY9A_OaES_plo'

export const supabase = createClient(supabaseUrl, supabaseKey)