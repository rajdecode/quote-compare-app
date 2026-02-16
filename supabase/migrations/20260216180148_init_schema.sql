-- Create Profiles Table (Extends Auth)
create table public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  role text check (role in ('buyer', 'vendor', 'admin')),
  business_name text,
  phone text,
  service_states text[], -- Array of strings
  service_postcodes text[],
  service_suburbs text[],
  excluded_postcodes text[],
  excluded_suburbs text[],
  services_offered text[], -- IDs of services
  company_name text, -- For buyers
  contact_name text, -- For buyers/vendors
  abn text,
  address text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS: Profiles
alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- Create Quotes Table
create table public.quotes (
  id uuid default gen_random_uuid() primary key,
  buyer_id uuid references public.profiles(id),
  service_type text not null,
  tiled_roof boolean,
  solar_system_size text,
  story_count text,
  roof_type text,
  address text,
  suburb text,
  postal_code text,
  state text, -- New field for filtering
  details text,
  status text default 'open',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS: Quotes
alter table public.quotes enable row level security;

create policy "Quotes are viewable by everyone (for now, or restric to vendors)."
  on quotes for select
  using ( true );

create policy "Buyers can insert quotes."
  on quotes for insert
  with check ( auth.uid() = buyer_id );
  
create policy "Buyers can update own quotes."
  on quotes for update
  using ( auth.uid() = buyer_id );

-- Create Quote Responses Table
create table public.quote_responses (
  id uuid default gen_random_uuid() primary key,
  quote_id uuid references public.quotes(id),
  vendor_id uuid references public.profiles(id),
  price numeric,
  message text,
  status text default 'responded',
  history jsonb, -- Keep history as JSONB for flexibility
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS: Responses
alter table public.quote_responses enable row level security;

create policy "Responses are viewable by involved parties."
  on quote_responses for select
  using ( true ); -- Simplified for now, refine later

create policy "Vendors can insert responses."
  on quote_responses for insert
  with check ( auth.uid() = vendor_id );

create policy "Vendors can update own responses."
  on quote_responses for update
  using ( auth.uid() = vendor_id );
