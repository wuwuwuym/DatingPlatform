-- =============================================================================
-- 校园圈：同校动态、点赞、评论、内容审核
--
-- 设计约束：
--   1. 动态只对同校可见（RLS 兜底），跨校查询返回 0 行。
--   2. 发表内容先过屏蔽词与结构校验，命中即拒收，不落库。
--   3. 被拉黑用户的内容不出现在对方时间线；管理员可隐藏/删除。
--   4. 媒体以 jsonb 数组存储；图片为压缩后的 data URL，视频为 https 外链。
-- =============================================================================

create type post_status as enum ('published', 'hidden', 'removed');

-- ---------------------------------------------------------------------------
-- 动态
-- ---------------------------------------------------------------------------
create table posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references users (id) on delete cascade,
  school_id uuid not null references schools (id) on delete restrict,
  body text not null default '',
  media jsonb not null default '[]'::jsonb,
  status post_status not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint posts_body_length check (char_length(body) <= 1000),
  constraint posts_body_or_media check (
    char_length(btrim(body)) > 0 or jsonb_array_length(media) > 0
  ),
  -- 元素结构由服务端校验；数据库只兜底类型与数量，避免无上限写入。
  constraint posts_media_shape check (
    jsonb_typeof(media) = 'array' and jsonb_array_length(media) <= 4
  )
);
create index posts_school_created_idx on posts (school_id, created_at desc, id desc);
create index posts_author_created_idx on posts (author_id, created_at desc, id desc);

create trigger posts_touch_updated_at
before update on posts
for each row execute function app.touch_updated_at();

create table post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts (id) on delete cascade,
  author_id uuid not null references users (id) on delete cascade,
  body text not null,
  status post_status not null default 'published',
  created_at timestamptz not null default now(),
  constraint post_comments_body_length check (char_length(body) between 1 and 500)
);
create index post_comments_post_created_idx on post_comments (post_id, created_at asc, id asc);

create table post_likes (
  post_id uuid not null references posts (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index post_likes_user_idx on post_likes (user_id);

-- ---------------------------------------------------------------------------
-- 举报扩展到动态：用户举报与动态举报二选一
-- ---------------------------------------------------------------------------
alter table reports add column target_post_id uuid references posts (id) on delete cascade;
alter table reports alter column target_user_id drop not null;
alter table reports add constraint reports_target_exactly_one check (
  num_nonnulls(target_user_id, target_post_id) = 1
);
create index reports_target_post_idx on reports (target_post_id);

-- ---------------------------------------------------------------------------
-- 权限
-- ---------------------------------------------------------------------------
grant select, insert on posts to app_authenticated;
grant update (status) on posts to app_authenticated;

grant select, insert, delete on post_comments to app_authenticated;
grant select, insert, delete on post_likes to app_authenticated;

-- ---------------------------------------------------------------------------
-- 行级安全
-- ---------------------------------------------------------------------------
alter table posts enable row level security;
alter table post_comments enable row level security;
alter table post_likes enable row level security;

-- 同校动态可见；作者可见自己的全部状态；被我拉黑的作者内容不出现。
create policy posts_read_school on posts
  for select to app_authenticated
  using (
    author_id = app.current_user_id()
    or (
      status = 'published'
      and school_id = app.current_school_id()
      and not exists (
        select 1
        from blocks b
        where b.blocker_id = app.current_user_id()
          and b.blocked_id = posts.author_id
      )
    )
  );

-- 只能以本人身份、在本人学校、以 published 状态发布。
create policy posts_insert_self on posts
  for insert to app_authenticated
  with check (
    author_id = app.current_user_id()
    and school_id = app.current_school_id()
    and status = 'published'
  );

-- 作者只能改 status（保留/撤回），不能改作者、学校或正文。
create policy posts_update_author on posts
  for update to app_authenticated
  using (author_id = app.current_user_id())
  with check (
    author_id = app.current_user_id()
    and status in ('published', 'removed')
  );

-- 评论跟随动态可见性：动态不可见时评论一并不可见。
create policy post_comments_read_visible on post_comments
  for select to app_authenticated
  using (
    (status = 'published' or author_id = app.current_user_id())
    and exists (select 1 from posts p where p.id = post_comments.post_id)
  );

create policy post_comments_insert_self on post_comments
  for insert to app_authenticated
  with check (
    author_id = app.current_user_id()
    and status = 'published'
    and exists (
      select 1 from posts p
      where p.id = post_comments.post_id and p.status = 'published'
    )
  );

create policy post_comments_delete_self on post_comments
  for delete to app_authenticated
  using (author_id = app.current_user_id());

create policy post_likes_read_visible on post_likes
  for select to app_authenticated
  using (exists (select 1 from posts p where p.id = post_likes.post_id));

create policy post_likes_insert_self on post_likes
  for insert to app_authenticated
  with check (
    user_id = app.current_user_id()
    and exists (
      select 1 from posts p
      where p.id = post_likes.post_id and p.status = 'published'
    )
  );

create policy post_likes_delete_self on post_likes
  for delete to app_authenticated
  using (user_id = app.current_user_id());

-- ---------------------------------------------------------------------------
-- 屏蔽词扩充：侮辱性词汇与人身攻击（管理端可继续维护）
-- ---------------------------------------------------------------------------
insert into sensitive_words (word) values
  ('傻逼'),
  ('煞笔'),
  ('沙比'),
  ('智障'),
  ('脑残'),
  ('弱智'),
  ('低能儿'),
  ('废物'),
  ('垃圾人'),
  ('贱人'),
  ('婊子'),
  ('去死'),
  ('滚蛋'),
  ('草泥马'),
  ('尼玛的'),
  ('狗东西'),
  ('死全家'),
  ('丑八怪'),
  ('死胖子'),
  ('娘炮'),
  ('人肉搜索'),
  ('开盒'),
  ('裸照'),
  ('援交')
on conflict (word) do nothing;
