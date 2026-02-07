
-- =============================================
-- FAZ-TUDO IMOBILIÁRIO - FULL DATABASE SCHEMA
-- =============================================

-- 1. ENUMS
CREATE TYPE public.app_role AS ENUM ('admin', 'imobiliaria', 'tecnico');
CREATE TYPE public.os_status AS ENUM (
  'aguardando_orcamento',
  'aguardando_aprovacao_admin',
  'enviado_imobiliaria',
  'aprovado_aguardando',
  'em_execucao',
  'concluido'
);
CREATE TYPE public.urgency_level AS ENUM ('baixa', 'media', 'alta', 'critica');

-- 2. PROFILES TABLE (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. USER_ROLES TABLE (separate from profiles per security requirements)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- 4. PROPERTIES TABLE
CREATE TABLE public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  imobiliaria_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  neighborhood TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'SP',
  zip_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. SERVICE_ORDERS TABLE
CREATE SEQUENCE IF NOT EXISTS public.os_number_seq START 1;

CREATE TABLE public.service_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_number TEXT NOT NULL UNIQUE,
  property_id UUID NOT NULL REFERENCES public.properties(id),
  imobiliaria_id UUID NOT NULL REFERENCES auth.users(id),
  tecnico_id UUID REFERENCES auth.users(id),
  problem TEXT NOT NULL,
  photos TEXT[] DEFAULT '{}',
  urgency public.urgency_level NOT NULL DEFAULT 'media',
  requester_name TEXT NOT NULL,
  -- Technician fields (only tecnico + admin can see/edit)
  technician_description TEXT,
  technician_cost NUMERIC(10,2),
  estimated_deadline INTEGER,
  quote_sent_at TIMESTAMPTZ,
  -- Admin pricing (manual margin over technician_cost)
  final_price NUMERIC(10,2),
  admin_approved_at TIMESTAMPTZ,
  -- Client approval
  client_approved_at TIMESTAMPTZ,
  -- Execution
  execution_started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status public.os_status NOT NULL DEFAULT 'aguardando_orcamento',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. COMPLETION_REPORTS TABLE
CREATE TABLE public.completion_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id UUID NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE UNIQUE,
  description TEXT NOT NULL,
  checklist JSONB NOT NULL DEFAULT '[]',
  photos_before TEXT[] DEFAULT '{}',
  photos_after TEXT[] DEFAULT '{}',
  observations TEXT,
  technician_signature TEXT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 7. FUNCTIONS
-- =============================================

-- Auto-generate OS number: OS-YYYY-0001
CREATE OR REPLACE FUNCTION public.generate_os_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.os_number := 'OS-' || EXTRACT(YEAR FROM now())::TEXT || '-' || LPAD(nextval('public.os_number_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Security definer: check role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Security definer: get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- =============================================
-- 8. TRIGGERS
-- =============================================

CREATE TRIGGER trg_generate_os_number
  BEFORE INSERT ON public.service_orders
  FOR EACH ROW EXECUTE FUNCTION public.generate_os_number();

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_properties_updated_at
  BEFORE UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_service_orders_updated_at
  BEFORE UPDATE ON public.service_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================
-- 9. ENABLE ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.completion_reports ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 10. RLS POLICIES
-- =============================================

-- PROFILES
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admin can view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Allow profile insert for own user"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- USER_ROLES
CREATE POLICY "Users can view own role"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admin can view all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can insert roles"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Allow self role insert during signup"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admin can update roles"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can delete roles"
  ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- PROPERTIES
CREATE POLICY "Imobiliaria can view own properties"
  ON public.properties FOR SELECT TO authenticated
  USING (imobiliaria_id = auth.uid());

CREATE POLICY "Admin can view all properties"
  ON public.properties FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Tecnico can view properties of assigned orders"
  ON public.properties FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.service_orders so
      WHERE so.property_id = properties.id
        AND so.tecnico_id = auth.uid()
    )
  );

CREATE POLICY "Imobiliaria can insert own properties"
  ON public.properties FOR INSERT TO authenticated
  WITH CHECK (
    imobiliaria_id = auth.uid()
    AND public.has_role(auth.uid(), 'imobiliaria')
  );

CREATE POLICY "Imobiliaria can update own properties"
  ON public.properties FOR UPDATE TO authenticated
  USING (imobiliaria_id = auth.uid())
  WITH CHECK (imobiliaria_id = auth.uid());

CREATE POLICY "Admin can manage all properties"
  ON public.properties FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- SERVICE_ORDERS
CREATE POLICY "Imobiliaria can view own orders"
  ON public.service_orders FOR SELECT TO authenticated
  USING (imobiliaria_id = auth.uid());

CREATE POLICY "Admin can view all orders"
  ON public.service_orders FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Tecnico can view assigned orders"
  ON public.service_orders FOR SELECT TO authenticated
  USING (tecnico_id = auth.uid());

CREATE POLICY "Imobiliaria can create orders"
  ON public.service_orders FOR INSERT TO authenticated
  WITH CHECK (
    imobiliaria_id = auth.uid()
    AND public.has_role(auth.uid(), 'imobiliaria')
  );

CREATE POLICY "Admin can update all orders"
  ON public.service_orders FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Tecnico can update assigned orders"
  ON public.service_orders FOR UPDATE TO authenticated
  USING (tecnico_id = auth.uid())
  WITH CHECK (tecnico_id = auth.uid());

CREATE POLICY "Imobiliaria can update own orders"
  ON public.service_orders FOR UPDATE TO authenticated
  USING (imobiliaria_id = auth.uid())
  WITH CHECK (imobiliaria_id = auth.uid());

CREATE POLICY "Admin can delete orders"
  ON public.service_orders FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- COMPLETION_REPORTS
CREATE POLICY "Tecnico can create reports for assigned orders"
  ON public.completion_reports FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.service_orders so
      WHERE so.id = service_order_id
        AND so.tecnico_id = auth.uid()
    )
  );

CREATE POLICY "Tecnico can view own reports"
  ON public.completion_reports FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.service_orders so
      WHERE so.id = service_order_id
        AND so.tecnico_id = auth.uid()
    )
  );

CREATE POLICY "Admin can view all reports"
  ON public.completion_reports FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Imobiliaria can view reports for own orders"
  ON public.completion_reports FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.service_orders so
      WHERE so.id = service_order_id
        AND so.imobiliaria_id = auth.uid()
    )
  );

CREATE POLICY "Tecnico can update own reports"
  ON public.completion_reports FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.service_orders so
      WHERE so.id = service_order_id
        AND so.tecnico_id = auth.uid()
    )
  );

CREATE POLICY "Admin can manage all reports"
  ON public.completion_reports FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- 11. VIEW: hide technician_cost from imobiliaria
-- =============================================

CREATE VIEW public.service_orders_client AS
SELECT
  id, os_number, property_id, imobiliaria_id, tecnico_id,
  problem, photos, urgency, requester_name,
  technician_description, estimated_deadline, quote_sent_at,
  final_price, admin_approved_at, client_approved_at,
  execution_started_at, completed_at,
  status, created_at, updated_at
FROM public.service_orders;

-- =============================================
-- 12. PERFORMANCE INDEXES
-- =============================================

CREATE INDEX idx_service_orders_imobiliaria ON public.service_orders(imobiliaria_id);
CREATE INDEX idx_service_orders_tecnico ON public.service_orders(tecnico_id);
CREATE INDEX idx_service_orders_status ON public.service_orders(status);
CREATE INDEX idx_service_orders_property ON public.service_orders(property_id);
CREATE INDEX idx_properties_imobiliaria ON public.properties(imobiliaria_id);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX idx_completion_reports_so ON public.completion_reports(service_order_id);
