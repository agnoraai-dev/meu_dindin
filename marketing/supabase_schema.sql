-- Tabela de Licenças e Assinaturas do Meu Dindin
CREATE TABLE IF NOT EXISTS public.licenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    plan_type VARCHAR(50) NOT NULL, -- 'web_subscription', 'desktop_lifetime', 'desktop_update_pass'
    status VARCHAR(50) DEFAULT 'active' NOT NULL, -- 'active', 'inactive', 'refunded', 'canceled'
    purchase_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Habilita o acesso rápido de leitura/busca por e-mail (indexação)
CREATE INDEX IF NOT EXISTS idx_licenses_email ON public.licenses(email);

-- Regra de Segurança RLS (Row Level Security) básica:
-- Permite leitura anônima para a função de validação (com API Key pública/anônima do Supabase)
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura pública para validação de e-mail" 
ON public.licenses FOR SELECT 
USING (status = 'active');
