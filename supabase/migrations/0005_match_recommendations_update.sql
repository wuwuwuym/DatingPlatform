-- =============================================================================
-- 匹配快照 upsert 的 UPDATE 策略
--
-- 0001 只给了 SELECT / INSERT 策略。getRecommendations 使用
-- `insert ... on conflict (user_id, target_id, batch_date) do update`，
-- 同一用户第二次刷新推荐时会走 UPDATE 分支，被 RLS 以 42501 拒绝
-- （表现为 GET /api/match/recommendations 403）。这里补齐本人更新策略，
-- 并保留 with check，防止把快照改到别人名下。
-- =============================================================================

create policy match_recommendations_update_self on match_recommendations
  for update to app_authenticated
  using (user_id = app.current_user_id())
  with check (user_id = app.current_user_id());
