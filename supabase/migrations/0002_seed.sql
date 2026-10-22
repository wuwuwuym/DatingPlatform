-- =============================================================================
-- 演示与基础数据（幂等）
-- =============================================================================

insert into schools (id, slug, name) values
  ('5c000000-0000-4000-8000-000000000001', 'xinghai', '星海大学'),
  ('5c000000-0000-4000-8000-000000000002', 'yunlu', '云麓大学'),
  ('5c000000-0000-4000-8000-000000000003', 'jiangcheng', '江城理工大学'),
  ('5c000000-0000-4000-8000-000000000004', 'nanwan', '南湾师范大学'),
  ('5c000000-0000-4000-8000-000000000005', 'beiling', '北岭财经大学')
on conflict (id) do nothing;

insert into achievements (id, code, name, description, threshold, condition_type) values
  (
    'a0000000-0000-4000-8000-000000000003',
    'spark',
    '初识火花',
    '与同一位好友连续打卡 3 天',
    3,
    'streak_days'
  ),
  (
    'a0000000-0000-4000-8000-000000000007',
    'tacit',
    '默契养成',
    '与同一位好友连续打卡 7 天',
    7,
    'streak_days'
  ),
  (
    'a0000000-0000-4000-8000-000000000021',
    'longterm',
    '长期搭子',
    '与同一位好友连续打卡 21 天',
    21,
    'streak_days'
  )
on conflict (id) do nothing;

-- 演示用模拟校园核验码；比赛现场可直接使用。
insert into verification_codes (school_id, code, max_uses, used_count)
values (null, 'CAMPUS-2026', 100000, 0)
on conflict (code) do nothing;

-- 最小管理端账号：只用于后台会话标识，不使用密码登录。
insert into users (id, school_id, role, nickname, bio, status) values
  (
    'ad000000-0000-4000-8000-000000000001',
    '5c000000-0000-4000-8000-000000000001',
    'admin',
    '校园同频小助手',
    '平台运营账号',
    'incomplete'
  )
on conflict (id) do nothing;

-- 初始敏感词（管理端可继续维护）
insert into sensitive_words (word) values
  ('代考'),
  ('刷单'),
  ('裸聊'),
  ('赌博'),
  ('毒品'),
  ('枪支'),
  ('诈骗'),
  ('约炮'),
  ('卖号'),
  ('扫码领红包')
on conflict (word) do nothing;
