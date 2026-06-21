/* ==========================================================================
   Vercel Serverless Function: Webhook do Checkout (api/webhook.js)
   ========================================================================== */

// Variáveis de ambiente necessárias na Vercel:
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY
// - KIWIFY_SECRET_TOKEN (opcional mas recomendado)

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Utilize POST.' });
  }

  // Validação do segredo para bloquear requisições não autorizadas
  const kiwifyToken = req.query.secret || req.headers['x-kiwify-signature'];
  const localSecret = process.env.KIWIFY_SECRET_TOKEN;
  if (localSecret && kiwifyToken !== localSecret) {
    return res.status(401).json({ error: 'Assinatura/Segredo inválido ou não autorizado.' });
  }

  // Inicializa o Supabase dentro do handler para garantir que as variáveis estão disponíveis
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Variáveis de ambiente SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não definidas.');
    return res.status(500).json({ error: 'Configuração do banco de dados pendente.' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  });

  const payload = req.body;

  // Extrai os campos do payload da Kiwify
  const orderStatus = payload.order_status;
  const clientEmail = payload.Customer?.email?.trim().toLowerCase();
  const productName = payload.Product?.product_name || '';
  const orderId = payload.order_id || '';
  const customerName = payload.Customer?.name || '';

  console.log(`Webhook recebido: email=${clientEmail}, status=${orderStatus}, produto=${productName}`);

  if (!clientEmail) {
    return res.status(400).json({ error: 'E-mail do cliente não localizado no payload.' });
  }

  // Mapeia o status da Kiwify para o status da licença
  let licenseStatus = 'inactive';
  if (orderStatus === 'paid') {
    licenseStatus = 'active';
  } else if (orderStatus === 'refunded' || orderStatus === 'chargeback') {
    licenseStatus = 'refunded';
  } else if (orderStatus === 'canceled') {
    licenseStatus = 'canceled';
  }

  // Determina o tipo de plano pelo nome do produto
  let planType = 'desktop_update_pass';
  if (productName.toLowerCase().includes('web') || productName.toLowerCase().includes('mensal')) {
    planType = 'web_subscription';
  } else if (productName.toLowerCase().includes('vitalícia') || productName.toLowerCase().includes('vitalicia') || productName.toLowerCase().includes('lifetime')) {
    planType = 'desktop_lifetime';
  }

  // Objeto limpo para inserir no banco (sem raw_payload para evitar problemas de serialização)
  const licenseRecord = {
    email: clientEmail,
    plan_type: planType,
    status: licenseStatus,
    last_updated: new Date().toISOString(),
    metadata: {
      kiwify_order_id: orderId,
      customer_name: customerName,
      product_name: productName
    }
  };

  console.log('Tentando salvar no banco:', JSON.stringify(licenseRecord));

  try {
    // Tenta fazer INSERT primeiro
    const { error: insertError } = await supabase
      .from('licenses')
      .insert(licenseRecord);

    if (insertError) {
      // Se o e-mail já existe (conflito de chave primária), faz UPDATE
      if (insertError.code === '23505') {
        const { error: updateError } = await supabase
          .from('licenses')
          .update({
            plan_type: planType,
            status: licenseStatus,
            last_updated: new Date().toISOString(),
            metadata: licenseRecord.metadata
          })
          .eq('email', clientEmail);

        if (updateError) {
          console.error('Erro ao atualizar licença existente:', JSON.stringify(updateError));
          return res.status(500).json({ error: 'Erro ao atualizar licença existente.', details: updateError.message });
        }

        console.log(`Licença de ${clientEmail} atualizada para: ${licenseStatus}`);
        return res.status(200).json({ success: true, action: 'updated', email: clientEmail, status: licenseStatus });
      }

      console.error('Erro ao inserir licença:', JSON.stringify(insertError));
      return res.status(500).json({ error: 'Erro ao persistir status da licença.', details: insertError.message });
    }

    console.log(`Licença de ${clientEmail} criada com sucesso: ${licenseStatus}`);
    return res.status(200).json({ success: true, action: 'created', email: clientEmail, status: licenseStatus });

  } catch (err) {
    console.error('Erro inesperado no processamento do webhook:', err.message);
    return res.status(500).json({ error: 'Erro interno inesperado.', details: err.message });
  }
}
