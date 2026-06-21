/* ==========================================================================
   Vercel Serverless Function: Validação de Licença (api/validate.js)
   ========================================================================== */

// Nota: Para conectar ao Supabase, instale a biblioteca do Supabase: npm install @supabase/supabase-js
// E configure as variáveis de ambiente no painel da Vercel:
// - SUPABASE_URL
// - SUPABASE_ANON_KEY

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

export default async function handler(req, res) {
  // Habilita CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ error: 'Parâmetro email é obrigatório.' });
  }

  if (!supabase) {
    return res.status(500).json({ 
      error: 'Conexão com o banco de dados não configurada. Defina SUPABASE_URL e SUPABASE_ANON_KEY na Vercel.' 
    });
  }

  try {
    // Busca a licença ativa associada ao e-mail informado
    const { data, error } = await supabase
      .from('licenses')
      .select('email, plan_type, status')
      .eq('email', email.trim().toLowerCase())
      .single();

    if (error || !data) {
      return res.status(200).json({ 
        active: false, 
        message: 'Nenhuma licença ativa encontrada para este e-mail.' 
      });
    }

    if (data.status !== 'active') {
      return res.status(200).json({ 
        active: false, 
        plan_type: data.plan_type,
        message: `Licença inativa. Status atual: ${data.status}` 
      });
    }

    // Licença válida e ativa!
    return res.status(200).json({
      active: true,
      plan_type: data.plan_type,
      message: 'Licença ativa e autorizada.'
    });

  } catch (err) {
    console.error('Erro ao validar licença:', err);
    return res.status(500).json({ error: 'Erro interno ao validar a licença.' });
  }
}
