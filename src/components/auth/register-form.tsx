"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api-client";
import { Banner, Button, Field, Input } from "@/components/ui";

interface School {
  id: string;
  name: string;
  slug: string;
}

const CONSENTS = [
  {
    key: "terms" as const,
    title: "用户协议",
    body: "同意平台的基本使用规则与社区约定。",
  },
  {
    key: "privacy" as const,
    title: "隐私政策",
    body: "学号仅做一次性核验并哈希存储，不展示、不对外提供。",
  },
  {
    key: "matching" as const,
    title: "匹配特质处理说明",
    body: "MBTI、星座、性格标签与爱好仅用于同校匹配计算。",
  },
];

export function RegisterForm({ demoCode }: { demoCode: string }) {
  const router = useRouter();
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolId, setSchoolId] = useState("");
  const [studentNo, setStudentNo] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [consents, setConsents] = useState({ terms: false, privacy: false, matching: false });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api<{ schools: School[] }>("/api/auth/schools")
      .then((data) => {
        setSchools(data.schools);
        setSchoolId((current) => current || data.schools[0]?.id || "");
      })
      .catch((cause) => setError(errorMessage(cause)));
  }, []);

  const allConsented = consents.terms && consents.privacy && consents.matching;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("两次输入的密码不一致");
      return;
    }
    if (!allConsented) {
      setError("请先勾选全部三项同意项");
      return;
    }

    setLoading(true);
    try {
      await api("/api/auth/register", {
        body: { schoolId, studentNo, verificationCode: code, password, consents },
      });
      router.replace("/profile");
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause));
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-[26px] font-semibold tracking-tight text-ink">用学号完成核验</h1>
      <p className="mt-2 text-[13px] leading-6 text-muted">
        核验通过后会生成一个匿名 ID，之后的所有匹配、聊天、打卡都只关联这个 ID。
      </p>

      <form onSubmit={onSubmit} className="mt-7 space-y-4">
        <Field label="学校">
          <select
            className="field-input"
            value={schoolId}
            onChange={(event) => setSchoolId(event.target.value)}
            required
          >
            {schools.length === 0 ? <option value="">加载中…</option> : null}
            {schools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="学号">
            <Input
              value={studentNo}
              onChange={(event) => setStudentNo(event.target.value)}
              inputMode="numeric"
              placeholder="20210001"
              required
            />
          </Field>
          <Field label="一次性核验码" hint={`演示码 ${demoCode}`}>
            <Input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="CAMPUS-2026"
              required
            />
          </Field>
        </div>

        <Field label="设置密码" hint="至少 8 位，含字母与数字">
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            placeholder="例如 <REDACTED>"
            required
          />
        </Field>

        <Field label="确认密码">
          <Input
            type="password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            autoComplete="new-password"
            placeholder="再输入一次"
            required
          />
        </Field>

        <div className="space-y-2.5 pt-1">
          <p className="text-[12px] font-medium text-ink-soft">分层同意（须逐项勾选）</p>
          {CONSENTS.map((item) => {
            const checked = consents[item.key];
            return (
              <label
                key={item.key}
                className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-surface p-3.5"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) =>
                    setConsents((current) => ({ ...current, [item.key]: event.target.checked }))
                  }
                  className="mt-0.5 size-4 accent-[#5b5bd6]"
                />
                <span>
                  <span className="block text-[13px] font-medium text-ink">{item.title}</span>
                  <span className="mt-0.5 block text-[11.5px] leading-5 text-muted">{item.body}</span>
                </span>
              </label>
            );
          })}
        </div>

        {error ? <Banner>{error}</Banner> : null}

        <Button type="submit" loading={loading} className="w-full">
          核验并创建账号
        </Button>
      </form>

      <p className="mt-6 text-center text-[13px] text-muted">
        已有账号？
        <Link href="/login" className="ml-1 font-medium text-brand">
          去登录
        </Link>
      </p>
    </div>
  );
}
