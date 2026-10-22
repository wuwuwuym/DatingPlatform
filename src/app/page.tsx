import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/auth";

const HIGHLIGHTS = [
  { title: "只同校", body: "学校 + 学号一次性核验，匹配池只对同校同学开放。" },
  { title: "可解释的匹配", body: "共同爱好、MBTI 维度、性格标签加权，给出 0–100 分和理由。" },
  { title: "好友才可私聊", body: "互相关注成为好友后解锁聊天，敏感词拦截与一键举报。" },
];

export default async function LandingPage() {
  const user = await getSessionUser();
  if (user) {
    redirect(user.status === "matchable" ? "/match" : "/profile");
  }

  return (
    <div className="shell flex min-h-dvh flex-col justify-between py-10">
      <div>
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-2xl bg-brand text-sm font-semibold text-white">
            同
          </span>
          <span className="text-[13px] font-medium tracking-wide text-ink-soft">校园同频</span>
        </div>

        <div className="mt-14">
          <h1 className="text-[34px] leading-[1.18] font-semibold tracking-tight text-ink">
            在同校，
            <br />
            遇见同频的人。
          </h1>
          <p className="mt-4 max-w-[300px] text-[14px] leading-6 text-muted">
            用一次身份核验，换一个真实的同校社交圈。资料匹配、互关成友、每日打卡，把「加个好友」变成有来有往的关系。
          </p>
        </div>

        <div className="mt-10 space-y-3">
          {HIGHLIGHTS.map((item, index) => (
            <div key={item.title} className="card flex gap-3 p-4">
              <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-brand-soft text-[11px] font-semibold text-brand">
                {index + 1}
              </span>
              <div>
                <p className="text-[13.5px] font-medium text-ink">{item.title}</p>
                <p className="mt-1 text-[12.5px] leading-5 text-muted">{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-10 space-y-3">
        <Link
          href="/register"
          className="flex w-full items-center justify-center rounded-2xl bg-brand px-5 py-3.5 text-sm font-medium text-white shadow-[0_16px_30px_-18px_rgba(91,91,214,0.95)]"
        >
          用学号完成核验
        </Link>
        <Link
          href="/login"
          className="flex w-full items-center justify-center rounded-2xl border border-line bg-surface px-5 py-3.5 text-sm font-medium text-ink-soft"
        >
          已有账号，去登录
        </Link>
        <p className="pt-1 text-center text-[11px] leading-5 text-muted">
          仅用于比赛演示，学号只做一次性核验并哈希存储，不展示、不流转。
        </p>
      </div>
    </div>
  );
}
