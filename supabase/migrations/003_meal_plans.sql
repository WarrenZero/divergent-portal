-- ─── Meal Plans Schema ────────────────────────────────────────────

-- Recipes library
create table recipes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  dietary_tags text[] default '{}',
  seasons text[] default '{}',
  ingredients jsonb,
  instructions text,
  macros jsonb,
  image_query text,
  image_url text,
  sensitivity_flags text[] default '{}',
  is_ai_generated boolean default false,
  created_by uuid references practitioners(id),
  is_public boolean default true,
  prep_time_minutes integer,
  servings integer,
  created_at timestamptz default now()
);

-- Client dietary sensitivities
create table client_sensitivities (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  sensitivity_name text not null,
  created_at timestamptz default now()
);

-- Client recipe ratings
create table recipe_ratings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  recipe_id uuid references recipes(id) on delete cascade,
  stars integer check (stars between 1 and 5),
  comment text,
  created_at timestamptz default now(),
  unique(client_id, recipe_id)
);

-- Client recipe saves (bookmarks)
create table recipe_saves (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  recipe_id uuid references recipes(id) on delete cascade,
  created_at timestamptz default now(),
  unique(client_id, recipe_id)
);

-- Practitioner → client recipe shares
create table practitioner_recipe_shares (
  id uuid primary key default gen_random_uuid(),
  practitioner_id uuid references practitioners(id),
  client_id uuid references clients(id),
  recipe_id uuid references recipes(id),
  note text,
  is_read boolean default false,
  shared_at timestamptz default now()
);

-- ─── RLS ──────────────────────────────────────────────────────────

alter table recipes enable row level security;
alter table client_sensitivities enable row level security;
alter table recipe_ratings enable row level security;
alter table recipe_saves enable row level security;
alter table practitioner_recipe_shares enable row level security;

-- recipes: authenticated users can read public recipes;
--          practitioners can create/edit their own
create policy "Anyone authenticated reads public recipes"
  on recipes for select
  using (is_public = true or created_by = (
    select id from practitioners where clerk_user_id = auth.jwt() ->> 'sub'
  ));

create policy "Practitioners insert own recipes"
  on recipes for insert
  with check (
    created_by = (
      select id from practitioners where clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

create policy "Practitioners update own recipes"
  on recipes for update
  using (
    created_by = (
      select id from practitioners where clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

-- client_sensitivities: clients own their rows;
--                       practitioners can read their clients' sensitivities
create policy "Clients read/write own sensitivities"
  on client_sensitivities for all
  using (
    client_id = (select id from clients where clerk_user_id = auth.jwt() ->> 'sub')
  );

create policy "Practitioners read client sensitivities"
  on client_sensitivities for select
  using (
    client_id in (
      select id from clients
      where practitioner_id = (
        select id from practitioners where clerk_user_id = auth.jwt() ->> 'sub'
      )
    )
  );

-- recipe_ratings: clients own their ratings;
--                practitioners can read their clients' ratings
create policy "Clients manage own ratings"
  on recipe_ratings for all
  using (
    client_id = (select id from clients where clerk_user_id = auth.jwt() ->> 'sub')
  );

create policy "Practitioners read client ratings"
  on recipe_ratings for select
  using (
    client_id in (
      select id from clients
      where practitioner_id = (
        select id from practitioners where clerk_user_id = auth.jwt() ->> 'sub'
      )
    )
  );

-- recipe_saves: clients own their saves
create policy "Clients manage own saves"
  on recipe_saves for all
  using (
    client_id = (select id from clients where clerk_user_id = auth.jwt() ->> 'sub')
  );

-- practitioner_recipe_shares: practitioners insert;
--                             client sees rows where client_id matches
create policy "Practitioners insert shares"
  on practitioner_recipe_shares for insert
  with check (
    practitioner_id = (
      select id from practitioners where clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

create policy "Practitioners read own shares"
  on practitioner_recipe_shares for select
  using (
    practitioner_id = (
      select id from practitioners where clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

create policy "Clients read shares addressed to them"
  on practitioner_recipe_shares for select
  using (
    client_id = (select id from clients where clerk_user_id = auth.jwt() ->> 'sub')
  );

create policy "Clients update read status on shares"
  on practitioner_recipe_shares for update
  using (
    client_id = (select id from clients where clerk_user_id = auth.jwt() ->> 'sub')
  );
