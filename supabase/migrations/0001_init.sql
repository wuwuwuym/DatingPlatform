-- =============================================================================
-- 校园同频 · 核心数据模型
-- 目标数据库：Supabase PostgreSQL（也可在本地 PGlite 内运行）
--
-- 设计约束：
--   1. 学号明文不落库：identity_verifications 只存 student_no_hash。
--   2. 所有业务表只引用匿名 user_id。
--   3. 行级安全（RLS）是最后一道防线：应用以 app_authenticated 角色访问，
--      当前用户由事务内的 app.user_id 设置决定，缺失即拒绝。
--   4. 表 owner（迁移账号）绕过 RLS，仅用于注册、建会话、管理端等系统路径。
-- =============================================================================

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_authenticated') then
    create role app_authenticated nologin;
  end if;
end $$;

create schema if not exists app;

-- ---------------------------------------------------------------------------
-- 枚举
-- ---------------------------------------------------------------------------
create type user_status as enum ('incomplete', 'matchable', 'banned');
create type user_role as enum ('user', 'admin');
create type gender_type as enum ('male', 'female');
create type match_pref as enum ('same', 'opposite');
create type report_status as enum ('pending', 'resolved', 'dismissed');
create type consent_scope as enum ('terms', 'privacy', 'matching');
create type message_status as enum ('sent', 'blocked');

-- ---------------------------------------------------------------------------
-- 基础表
-- ---------------------------------------------------------------------------
create table schools (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

create table users (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools (id) on delete restrict,
  role user_role not null default 'user',
  nickname text not null default '',
  avatar_url text,
  gender gender_type,
  grade text,
  department text,
  mbti text,
  zodiac text,
  personality_tags text[] not null default '{}',
  hobbies text[] not null default '{}',
  bio text not null default '',
  match_gender_pref match_pref,
  status user_status not null default 'incomplete',
  -- 密码仅存 scrypt 哈希；该列禁止应用角色读取。
  password_hash text not null default '',
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_mbti_valid check (mbti is null or mbti ~ '^[EI][NS][TF][JP]$'),
  constraint users_zodiac_valid check (
    zodiac is null
    or zodiac in (
      'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
      'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'
    )
  ),
  -- 进入匹配池的硬性资料完整性，数据库层兜底，防止绕过接口直接改状态。
  constraint users_matchable_complete check (
    status <> 'matchable'
    or (
      nickname <> ''
      and gender is not null
      and match_gender_pref is not null
      and mbti is not null
      and zodiac is not null
      and coalesce(array_length(hobbies, 1), 0) >= 1
      and coalesce(array_length(personality_tags, 1), 0) >= 1
    )
  )
);
create index users_school_status_idx on users (school_id, status);

create table identity_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references users (id) on delete cascade,
  school_id uuid not null references schools (id) on delete restrict,
  student_no_hash text not null,
  status text not null default 'verified' check (status in ('verified', 'revoked')),
  verified_at timestamptz not null default now(),
  unique (school_id, student_no_hash)
);

create table consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  policy_version text not null,
  scope consent_scope not null,
  agreed_at timestamptz not null default now(),
  unique (user_id, scope, policy_version)
);

create table verification_codes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools (id) on delete cascade,
  code text not null unique,
  max_uses integer not null default 1 check (max_uses > 0),
  used_count integer not null default 0 check (used_count >= 0),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 社交关系
-- ---------------------------------------------------------------------------
create table follows (
  follower_id uuid not null references users (id) on delete cascade,
  followee_id uuid not null references users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  constraint follows_no_self check (follower_id <> followee_id)
);
create index follows_followee_idx on follows (followee_id);

create table friendships (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references users (id) on delete cascade,
  user_b uuid not null references users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_a, user_b),
  constraint friendships_ordered check (user_a < user_b)
);
create index friendships_b_idx on friendships (user_b);

create table blocks (
  blocker_id uuid not null references users (id) on delete cascade,
  blocked_id uuid not null references users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocks_no_self check (blocker_id <> blocked_id)
);
create index blocks_blocked_idx on blocks (blocked_id);

-- ---------------------------------------------------------------------------
-- 私聊
-- ---------------------------------------------------------------------------
create table conversations (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references users (id) on delete cascade,
  user_b uuid not null references users (id) on delete cascade,
  user_a_last_read_at timestamptz not null default now(),
  user_b_last_read_at timestamptz not null default now(),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_a, user_b),
  constraint conversations_ordered check (user_a < user_b)
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations (id) on delete cascade,
  sender_id uuid not null references users (id) on delete cascade,
  content text not null check (char_length(content) between 1 and 1000),
  status message_status not null default 'sent',
  created_at timestamptz not null default now()
);
create index messages_conversation_created_idx
  on messages (conversation_id, created_at desc, id desc);

-- ---------------------------------------------------------------------------
-- 打卡与成就
-- ---------------------------------------------------------------------------
create table checkins (
  id uuid primary key default gen_random_uuid(),
  pair_key text not null,
  user_id uuid not null references users (id) on delete cascade,
  partner_id uuid not null references users (id) on delete cascade,
  checkin_date date not null,
  created_at timestamptz not null default now(),
  unique (pair_key, user_id, checkin_date),
  constraint checkins_no_self check (user_id <> partner_id)
);
create index checkins_pair_user_date_idx
  on checkins (pair_key, user_id, checkin_date desc);

create table achievements (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text not null,
  condition_type text not null default 'streak_days',
  threshold integer not null check (threshold > 0)
);

create table user_achievements (
  user_id uuid not null references users (id) on delete cascade,
  achievement_id uuid not null references achievements (id) on delete cascade,
  pair_key text,
  obtained_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

-- ---------------------------------------------------------------------------
-- 匹配推荐 / 举报 / 敏感词
-- ---------------------------------------------------------------------------
create table match_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  target_id uuid not null references users (id) on delete cascade,
  score integer not null check (score between 0 and 100),
  reasons text[] not null default '{}',
  breakdown jsonb not null default '{}'::jsonb,
  batch_date date not null default current_date,
  created_at timestamptz not null default now(),
  unique (user_id, target_id, batch_date),
  constraint match_recommendations_no_self check (user_id <> target_id)
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references users (id) on delete cascade,
  target_user_id uuid not null references users (id) on delete cascade,
  type text not null check (
    type in ('harassment', 'fake_identity', 'inappropriate', 'other')
  ),
  description text not null default '',
  status report_status not null default 'pending',
  created_at timestamptz not null default now(),
  handled_at timestamptz,
  handled_by uuid references users (id),
  constraint reports_no_self check (reporter_id <> target_user_id)
);
create index reports_status_idx on reports (status, created_at desc);

create table sensitive_words (
  id uuid primary key default gen_random_uuid(),
  word text not null unique,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 辅助函数：当前身份
-- ---------------------------------------------------------------------------
create or replace function app.current_user_id()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('app.user_id', true), '')::uuid
$$;

create or replace function app.current_school_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select school_id from users where id = app.current_user_id()
$$;

create or replace function app.is_conversation_member(cid uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from conversations c
    where c.id = cid
      and (c.user_a = app.current_user_id() or c.user_b = app.current_user_id())
  )
$$;

create or replace function app.are_friends(other uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from friendships f
    where f.user_a = least(app.current_user_id(), other)
      and f.user_b = greatest(app.current_user_id(), other)
  )
$$;

create or replace function app.pair_key(a uuid, b uuid)
returns text
language sql
immutable
as $$
  select least(a, b)::text || ':' || greatest(a, b)::text
$$;

-- 资料完整性由服务端校验一次，数据库再兜底一次。
-- 以 SECURITY DEFINER 执行，避免应用角色获得 users.status 的写权限。
create or replace function app.mark_profile_matchable()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := app.current_user_id();
begin
  if uid is null then
    raise exception 'UNAUTHENTICATED' using errcode = '28000';
  end if;

  update users
     set status = 'matchable',
         updated_at = now()
   where id = uid
     and status = 'incomplete'
     and nickname <> ''
     and gender is not null
     and match_gender_pref is not null
     and mbti is not null
     and zodiac is not null
     and coalesce(array_length(hobbies, 1), 0) >= 1
     and coalesce(array_length(personality_tags, 1), 0) >= 1;

  if not found then
    raise exception 'PROFILE_INCOMPLETE' using errcode = 'P0001';
  end if;
end;
$$;

create or replace function app.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_touch_updated_at
before update on users
for each row execute function app.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 权限：应用角色只能访问业务表，且 users 的敏感列不可写
-- ---------------------------------------------------------------------------
grant usage on schema public, app to app_authenticated;

grant select on
  schools,
  achievements,
  sensitive_words,
  consents,
  follows,
  friendships,
  blocks,
  conversations,
  messages,
  checkins,
  user_achievements,
  match_recommendations,
  reports
to app_authenticated;

-- users 采用列级 SELECT：password_hash 对应用角色完全不可见。
grant select (
  id,
  school_id,
  role,
  nickname,
  avatar_url,
  gender,
  grade,
  department,
  mbti,
  zodiac,
  personality_tags,
  hobbies,
  bio,
  match_gender_pref,
  status,
  created_at,
  updated_at
) on users to app_authenticated;

grant insert, update on consents to app_authenticated;
grant insert, delete on follows to app_authenticated;
grant insert, delete on blocks to app_authenticated;
grant insert on messages to app_authenticated;
grant insert on checkins to app_authenticated;
grant insert on match_recommendations to app_authenticated;
grant insert on reports to app_authenticated;

-- 会话已读时间可由参与者更新；closed_at 只能由系统路径维护。
grant update (user_a_last_read_at, user_b_last_read_at)
  on conversations to app_authenticated;

-- 列级权限：昵称/资料可改，role、status、school_id 不可直接改。
revoke insert, update on users from app_authenticated;
grant update (
  nickname,
  avatar_url,
  gender,
  grade,
  department,
  mbti,
  zodiac,
  personality_tags,
  hobbies,
  bio,
  match_gender_pref
) on users to app_authenticated;

grant execute on function
  app.current_user_id(),
  app.current_school_id(),
  app.is_conversation_member(uuid),
  app.are_friends(uuid),
  app.pair_key(uuid, uuid),
  app.mark_profile_matchable()
to app_authenticated;

-- ---------------------------------------------------------------------------
-- 行级安全
-- ---------------------------------------------------------------------------
alter table schools enable row level security;
alter table users enable row level security;
alter table identity_verifications enable row level security;
alter table consents enable row level security;
alter table follows enable row level security;
alter table friendships enable row level security;
alter table blocks enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table checkins enable row level security;
alter table achievements enable row level security;
alter table user_achievements enable row level security;
alter table match_recommendations enable row level security;
alter table reports enable row level security;
alter table sensitive_words enable row level security;
alter table verification_codes enable row level security;

-- 学校与成就定义是公开只读数据
create policy schools_read_all on schools
  for select to app_authenticated using (true);

create policy achievements_read_all on achievements
  for select to app_authenticated using (true);

create policy sensitive_words_read_all on sensitive_words
  for select to app_authenticated using (true);

-- 用户：本人资料 + 同校可匹配用户的公开资料
create policy users_read_self on users
  for select to app_authenticated
  using (id = app.current_user_id());

create policy users_read_school_peers on users
  for select to app_authenticated
  using (
    status = 'matchable'
    and id <> app.current_user_id()
    and school_id = app.current_school_id()
  );

create policy users_update_self on users
  for update to app_authenticated
  using (id = app.current_user_id())
  with check (id = app.current_user_id());

-- 身份核验记录：应用角色完全不可见（仅服务端系统路径访问）
-- 故意不创建任何 policy。

-- 同意记录：本人可读写
create policy consents_read_self on consents
  for select to app_authenticated
  using (user_id = app.current_user_id());

create policy consents_insert_self on consents
  for insert to app_authenticated
  with check (user_id = app.current_user_id());

-- 关注：本人作为关注方或被关注方可见，只能操作自己发出的关注
create policy follows_read_involved on follows
  for select to app_authenticated
  using (
    follower_id = app.current_user_id() or followee_id = app.current_user_id()
  );

create policy follows_insert_self on follows
  for insert to app_authenticated
  with check (follower_id = app.current_user_id());

create policy follows_delete_self on follows
  for delete to app_authenticated
  using (follower_id = app.current_user_id());

-- 好友：仅双方可见
create policy friendships_read_involved on friendships
  for select to app_authenticated
  using (user_a = app.current_user_id() or user_b = app.current_user_id());

-- 拉黑：双方可见，仅拉黑方可用
create policy blocks_read_involved on blocks
  for select to app_authenticated
  using (
    blocker_id = app.current_user_id() or blocked_id = app.current_user_id()
  );

create policy blocks_insert_self on blocks
  for insert to app_authenticated
  with check (blocker_id = app.current_user_id());

create policy blocks_delete_self on blocks
  for delete to app_authenticated
  using (blocker_id = app.current_user_id());

-- 会话：仅参与者可见
create policy conversations_read_involved on conversations
  for select to app_authenticated
  using (user_a = app.current_user_id() or user_b = app.current_user_id());

create policy conversations_update_read on conversations
  for update to app_authenticated
  using (user_a = app.current_user_id() or user_b = app.current_user_id())
  with check (user_a = app.current_user_id() or user_b = app.current_user_id());

-- 消息：仅会话双方可读，发送者必须是本人且属于该会话
create policy messages_read_participants on messages
  for select to app_authenticated
  using (app.is_conversation_member(conversation_id));

create policy messages_insert_participants on messages
  for insert to app_authenticated
  with check (
    sender_id = app.current_user_id()
    and app.is_conversation_member(conversation_id)
  );

-- 打卡：本人或搭档可见，只能写自己的记录
create policy checkins_read_involved on checkins
  for select to app_authenticated
  using (
    user_id = app.current_user_id() or partner_id = app.current_user_id()
  );

create policy checkins_insert_self on checkins
  for insert to app_authenticated
  with check (user_id = app.current_user_id());

-- 成就：本人与好友可见
create policy user_achievements_read_related on user_achievements
  for select to app_authenticated
  using (
    user_id = app.current_user_id() or app.are_friends(user_id)
  );

-- 匹配快照：仅本人可见
create policy match_recommendations_read_self on match_recommendations
  for select to app_authenticated
  using (user_id = app.current_user_id());

create policy match_recommendations_insert_self on match_recommendations
  for insert to app_authenticated
  with check (user_id = app.current_user_id());

-- upsert 需要 UPDATE 权限，只放开可重算的列
grant update (score, reasons, breakdown, created_at)
  on match_recommendations to app_authenticated;

-- 举报：本人可提交与查看自己的举报
create policy reports_read_self on reports
  for select to app_authenticated
  using (reporter_id = app.current_user_id());

create policy reports_insert_self on reports
  for insert to app_authenticated
  with check (reporter_id = app.current_user_id());
