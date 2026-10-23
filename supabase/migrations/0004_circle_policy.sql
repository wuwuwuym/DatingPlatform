-- =============================================================================
-- 收紧校园圈动态的 UPDATE 策略
--
-- 背景：0003 的策略只限制「新状态」为 published / removed，作者理论上可以把
-- 被管理员隐藏的动态重新发布。这里改为：
--   - 可操作的旧状态：published / hidden（作者可撤回）
--   - 唯一允许的新状态：removed
-- 这样「隐藏」只能由管理端系统路径恢复，作者无法自行绕过审核。
-- =============================================================================

drop policy if exists posts_update_author on posts;

create policy posts_update_author on posts
  for update to app_authenticated
  using (
    author_id = app.current_user_id()
    and status in ('published', 'hidden')
  )
  with check (
    author_id = app.current_user_id()
    and status = 'removed'
  );
