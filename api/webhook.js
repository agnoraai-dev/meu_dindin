/* ==========================================================================
   Vercel Serverless Function: Webhook do Checkout (api/webhook.js)
   ========================================================================== */

// Exemplo configurado para receber notificações automáticas de vendas da Kiwify.
// Variáveis de ambiente necessárias na Vercel:
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY (Chave bypass do RLS para poder criar/editar chaves)
// - KIWIFY_SECRET_TOKEN (Token opcional de segurança configurado nas configurações de webhook da Kiwify)

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
// Usamos a SERVICE ROLE KEY para que a API de webhook tenha permissão de escrita no banco
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = (supabaseUrl && supabaseServiceKey) 
  ? createClient(supabaseUrl, supabaseServiceKey) 
  : null;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Utilize POST.' });
  }

  // Validação opcional do segredo da Kiwify para evitar requisições maliciosas de terceiros
  const kiwifyToken = req.query.secret || req.headers['x-kiwify-signature'];
  const localSecret = process.env.KIWIFY_SECRET_TOKEN;
  if (localSecret && kiwifyToken !== localSecret) {
    return res.status(401).json({ error: 'Assinatura/Segredo inválido ou não autorizado.' });
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Configuração do banco de dados pendente.' });
  }

  const payload = req.body;
  
  // A Kiwify envia eventos de status da compra no campo `order_status`
  // Principais status: 'paid' (aprovado), 'refunded' (reembolsado), 'chargeback' (estornado), 'canceled' (cancelado)
  const orderStatus = payload.order_status;
  const clientEmail = payload.Customer?.email?.trim().toLowerCase();
  const productPlan = payload.Product?.product_name || 'web_subscription'; // Mapeia com base no nome do produto comprado

  if (!clientEmail) {
    return res.status(400).json({ error: 'E-mail do cliente não localizado no payload.' });
  }

  // Mapeia o status da Kiwify para o status da nossa licença
  let licenseStatus = 'inactive';
  if (orderStatus === 'paid') {
    licenseStatus = 'active';
  } else if (orderStatus === 'refunded' || orderStatus === 'chargeback') {
    licenseStatus = 'refunded';
  } else if (orderStatus === 'canceled') {
    licenseStatus = 'canceled';
  }

  try {
    // Insere ou atualiza o status de licença do usuário (Upsert)
    const { error } = await supabase
      .from('licenses')
      .upsert({
        email: clientEmail,
        plan_type: productPlan.includes('Web') ? 'web_subscription' : 'desktop_update_pass',
        status: licenseStatus,
        last_updated: new Date().toISOString(),
        metadata: {
          kiwify_order_id: payload.order_id,
          customer_name: payload.Customer?.name,
          raw_payload: payload // Grava o payload completo em JSONB para auditorias futuras
        }
      }, { onConflict: 'email' });

    if (error) {
      console.error('Erro ao salvar no banco:', error);
      return res.status(500).json({ error: 'Erro ao persistir status da licença.' });
    }

    console.log(`Licença para ${clientEmail} atualizada com sucesso para: ${licenseStatus}`);
    return res.status(200).json({ success: true, message: `Status de ${clientEmail} atualizado para ${licenseStatus}.` });

  } catch (err) {
    console.error('Erro no processamento do webhook:', err);
    return res.status(500).json({ error: 'Erro interno no processamento do webhook.' });
  }
}
