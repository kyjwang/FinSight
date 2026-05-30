create extension if not exists "pgcrypto";

create type public.asset_type as enum ('stock', 'crypto');
create type public.thesis_stance as enum ('bullish', 'neutral', 'bearish');
create type public.thesis_horizon as enum ('1D', '1W', '1M');
create type public.result_status as enum ('pending', 'hit', 'miss');

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text unique not null check (handle ~ '^[a-z0-9_]{3,24}$'),
  display_name text not null,
  bio text not null default '',
  avatar_url text,
  accuracy numeric(5,4) not null default 0,
  average_return numeric(8,4) not null default 0,
  created_at timestamptz not null default now()
);

create table public.follows (
  follower_id uuid not null references public.users(id) on delete cascade,
  following_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create table public.assets (
  symbol text primary key,
  name text not null,
  type public.asset_type not null,
  exchange text not null,
  price numeric(18,6) not null default 0,
  change_percent numeric(8,4) not null default 0,
  updated_at timestamptz not null default now()
);

create table public.market_candles (
  id uuid primary key default gen_random_uuid(),
  symbol text not null references public.assets(symbol) on delete cascade,
  interval text not null,
  candle_time timestamptz not null,
  open numeric(18,6) not null,
  high numeric(18,6) not null,
  low numeric(18,6) not null,
  close numeric(18,6) not null,
  volume numeric(20,2) not null default 0,
  source text not null default 'demo-cache',
  unique (symbol, interval, candle_time)
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.users(id) on delete cascade,
  symbol text not null references public.assets(symbol),
  stance public.thesis_stance not null,
  horizon public.thesis_horizon not null,
  title text not null check (char_length(title) between 4 and 140),
  body text not null check (char_length(body) between 10 and 2000),
  locked boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.post_forecasts (
  id uuid primary key default gen_random_uuid(),
  post_id uuid unique not null references public.posts(id) on delete cascade,
  model_name text not null,
  generated_at timestamptz not null default now(),
  horizon public.thesis_horizon not null,
  confidence numeric(5,4) not null check (confidence between 0 and 1),
  summary text not null,
  points jsonb not null,
  backtest jsonb not null
);

create table public.post_results (
  post_id uuid primary key references public.posts(id) on delete cascade,
  status public.result_status not null default 'pending',
  realized_move_percent numeric(8,4),
  forecast_error_percent numeric(8,4),
  evaluated_at timestamptz
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.users(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

create table public.likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.bookmarks (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.watchlists (
  user_id uuid not null references public.users(id) on delete cascade,
  symbol text not null references public.assets(symbol) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, symbol)
);

create table public.chats (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.chat_members (
  chat_id uuid not null references public.chats(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (chat_id, user_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  author_id uuid not null references public.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  actor_id uuid references public.users(id) on delete set null,
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;
alter table public.follows enable row level security;
alter table public.assets enable row level security;
alter table public.market_candles enable row level security;
alter table public.posts enable row level security;
alter table public.post_forecasts enable row level security;
alter table public.post_results enable row level security;
alter table public.comments enable row level security;
alter table public.likes enable row level security;
alter table public.bookmarks enable row level security;
alter table public.watchlists enable row level security;
alter table public.chats enable row level security;
alter table public.chat_members enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;

create policy "Profiles are public" on public.users for select using (true);
create policy "Users create own profile" on public.users for insert with check (auth.uid() = id);
create policy "Users update own profile" on public.users for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "Follows are public" on public.follows for select using (true);
create policy "Users follow from own account" on public.follows for insert with check (auth.uid() = follower_id);
create policy "Users unfollow from own account" on public.follows for delete using (auth.uid() = follower_id);

create policy "Assets are public" on public.assets for select using (true);
create policy "Candles are public" on public.market_candles for select using (true);

create policy "Posts are public" on public.posts for select using (true);
create policy "Users create own posts" on public.posts for insert with check (auth.uid() = author_id);
create policy "Unlocked own posts can be edited" on public.posts for update using (auth.uid() = author_id and locked = false) with check (auth.uid() = author_id);

create policy "Forecasts are public" on public.post_forecasts for select using (true);
create policy "Results are public" on public.post_results for select using (true);

create policy "Comments are public" on public.comments for select using (true);
create policy "Users create own comments" on public.comments for insert with check (auth.uid() = author_id);
create policy "Users delete own comments" on public.comments for delete using (auth.uid() = author_id);

create policy "Likes are public" on public.likes for select using (true);
create policy "Users like as self" on public.likes for insert with check (auth.uid() = user_id);
create policy "Users unlike as self" on public.likes for delete using (auth.uid() = user_id);

create policy "Users see own bookmarks" on public.bookmarks for select using (auth.uid() = user_id);
create policy "Users bookmark as self" on public.bookmarks for insert with check (auth.uid() = user_id);
create policy "Users remove own bookmarks" on public.bookmarks for delete using (auth.uid() = user_id);

create policy "Users see own watchlist" on public.watchlists for select using (auth.uid() = user_id);
create policy "Users add own watchlist rows" on public.watchlists for insert with check (auth.uid() = user_id);
create policy "Users remove own watchlist rows" on public.watchlists for delete using (auth.uid() = user_id);

create policy "Members see chats" on public.chats for select using (
  exists (select 1 from public.chat_members cm where cm.chat_id = id and cm.user_id = auth.uid())
);
create policy "Users create chats" on public.chats for insert with check (auth.uid() = created_by);

create policy "Members see chat members" on public.chat_members for select using (
  exists (select 1 from public.chat_members cm where cm.chat_id = chat_members.chat_id and cm.user_id = auth.uid())
);
create policy "Users add self to chat" on public.chat_members for insert with check (auth.uid() = user_id);

create policy "Members see messages" on public.messages for select using (
  exists (select 1 from public.chat_members cm where cm.chat_id = messages.chat_id and cm.user_id = auth.uid())
);
create policy "Members send own messages" on public.messages for insert with check (
  auth.uid() = author_id and exists (
    select 1 from public.chat_members cm where cm.chat_id = messages.chat_id and cm.user_id = auth.uid()
  )
);

create policy "Users see own notifications" on public.notifications for select using (auth.uid() = user_id);
create policy "Users mark own notifications" on public.notifications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index posts_symbol_created_idx on public.posts(symbol, created_at desc);
create index comments_post_created_idx on public.comments(post_id, created_at desc);
create index messages_chat_created_idx on public.messages(chat_id, created_at desc);
create index market_candles_symbol_time_idx on public.market_candles(symbol, interval, candle_time desc);
