
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'imobiliaria', 'tecnico');
CREATE TYPE public.os_status AS ENUM (
  'aguardando_orcamento_prestador',
  'aguardando_aprovacao_admin',
  'enviado_imobiliaria',
  'aprovado_aguardando',
  'em_execucao',
  'concluido'
);
CREATE TYPE public.urgency_level AS ENUM ('baixa', 'media', 'alta', 'critica');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  cnpj TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Authenticated can view roles" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Properties
CREATE TABLE public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  imobiliaria_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  neighborhood TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT '',
  zip_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do anything on properties" ON public.properties FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Imobiliarias can view own properties" ON public.properties FOR SELECT TO authenticated USING (imobiliaria_id = auth.uid());
CREATE POLICY "Imobiliarias can insert own properties" ON public.properties FOR INSERT TO authenticated WITH CHECK (imobiliaria_id = auth.uid());
CREATE POLICY "Imobiliarias can update own properties" ON public.properties FOR UPDATE TO authenticated USING (imobiliaria_id = auth.uid());

-- Service Orders
CREATE TABLE public.service_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_number TEXT UNIQUE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  imobiliaria_id UUID NOT NULL REFERENCES public.profiles(id),
  tecnico_id UUID REFERENCES public.profiles(id),
  problem TEXT NOT NULL,
  photos TEXT[] DEFAULT '{}',
  urgency public.urgency_level NOT NULL DEFAULT 'media',
  requester_name TEXT NOT NULL DEFAULT '',
  technician_description TEXT,
  technician_cost NUMERIC(12,2),
  estimated_deadline INTEGER,
  quote_sent_at TIMESTAMPTZ,
  final_price NUMERIC(12,2),
  admin_approved_at TIMESTAMPTZ,
  client_approved_at TIMESTAMPTZ,
  execution_started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status public.os_status NOT NULL DEFAULT 'aguardando_orcamento_prestador',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on service_orders" ON public.service_orders FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Imobiliarias view own orders" ON public.service_orders FOR SELECT TO authenticated USING (imobiliaria_id = auth.uid());
CREATE POLICY "Imobiliarias insert own orders" ON public.service_orders FOR INSERT TO authenticated WITH CHECK (imobiliaria_id = auth.uid());
CREATE POLICY "Tecnicos view assigned orders" ON public.service_orders FOR SELECT TO authenticated USING (tecnico_id = auth.uid());
CREATE POLICY "Tecnicos update assigned orders" ON public.service_orders FOR UPDATE TO authenticated USING (tecnico_id = auth.uid());

-- OS number auto-generation
CREATE OR REPLACE FUNCTION public.generate_os_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(os_number FROM 4) AS INTEGER)), 0) + 1 INTO next_num FROM public.service_orders WHERE os_number IS NOT NULL;
  NEW.os_number := 'OS-' || LPAD(next_num::TEXT, 5, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_os_number
BEFORE INSERT ON public.service_orders
FOR EACH ROW WHEN (NEW.os_number IS NULL)
EXECUTE FUNCTION public.generate_os_number();

-- Service Order Items
CREATE TABLE public.service_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id UUID NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  real_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.service_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on items" ON public.service_order_items FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Tecnicos manage items on assigned orders" ON public.service_order_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.service_orders WHERE id = service_order_id AND tecnico_id = auth.uid()));
CREATE POLICY "Imobiliarias view items on own orders" ON public.service_order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.service_orders WHERE id = service_order_id AND imobiliaria_id = auth.uid()));

-- Comments
CREATE TABLE public.service_order_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id UUID NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.service_order_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on comments" ON public.service_order_comments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authors can insert comments" ON public.service_order_comments FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY "Users can view comments on accessible orders" ON public.service_order_comments FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.service_orders WHERE id = service_order_id AND (imobiliaria_id = auth.uid() OR tecnico_id = auth.uid())
  ));

-- Completion Reports
CREATE TABLE public.completion_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id UUID NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE UNIQUE,
  description TEXT NOT NULL,
  checklist JSONB NOT NULL DEFAULT '[]',
  photos_before TEXT[] DEFAULT '{}',
  photos_after TEXT[] DEFAULT '{}',
  observations TEXT,
  technician_signature TEXT NOT NULL DEFAULT '',
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.completion_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on reports" ON public.completion_reports FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Tecnicos manage own reports" ON public.completion_reports FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.service_orders WHERE id = service_order_id AND tecnico_id = auth.uid()));
CREATE POLICY "Imobiliarias view reports on own orders" ON public.completion_reports FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.service_orders WHERE id = service_order_id AND imobiliaria_id = auth.uid()));

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_service_orders_updated_at BEFORE UPDATE ON public.service_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_service_order_items_updated_at BEFORE UPDATE ON public.service_order_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('os-photos', 'os-photos', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('completion-reports', 'completion-reports', true) ON CONFLICT DO NOTHING;

CREATE POLICY "Authenticated can upload os-photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'os-photos');
CREATE POLICY "Public can view os-photos" ON storage.objects FOR SELECT USING (bucket_id = 'os-photos');
CREATE POLICY "Authenticated can upload avatars" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');
CREATE POLICY "Public can view avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Authenticated can upload completion-reports" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'completion-reports');
CREATE POLICY "Public can view completion-reports" ON storage.objects FOR SELECT USING (bucket_id = 'completion-reports');

-- Profile auto-creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
