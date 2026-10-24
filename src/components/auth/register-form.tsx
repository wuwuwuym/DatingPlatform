"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, GraduationCap, KeyRound, Lock, ShieldCheck, User } from "lucide-react";
import { api, errorMessage } from "@/lib/api-client";
import {
  AuthError,
  AuthField,
  AuthInput,
  AuthSelect,
  AuthSubmit,
  AuthSwitch,
} from "./auth-ui";

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
  const reduce = useReducedMotion();
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
      // Full navigation after account creation so the new session is applied
      // before the profile page renders.
      window.location.assign("/profile");
    } catch (cause) {
      setError(errorMessage(cause));
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <header>
        <h1 className="text-[30px] font-bold leading-tight tracking-[-0.03em] text-slate-900 sm:text-[32px]">
          用学号完成核验
        </h1>
        <p className="mt-2.5 text-[13px] leading-6 text-slate-500">
          核验通过后会生成一个匿名 ID，之后的匹配、聊天与打卡都只关联这个 ID。
        </p>
      </header>

      <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-brand-soft/70 px-3.5 py-3 text-[12px] leading-5 text-slate-600">
        <ShieldCheck
          className="mt-0.5 size-4 shrink-0 text-brand"
          strokeWidth={1.8}
          aria-hidden="true"
        />
        <span>学号只用于一次性身份核验，不会出现在任何页面</span>
      </div>

      <form onSubmit={onSubmit} className="mt-7 space-y-4">
        <AuthField label="学校" htmlFor="register-school">
          <AuthSelect
            id="register-school"
            icon={GraduationCap}
            value={schoolId}
            onChange={(event) => setSchoolId(event.target.value)}
            disabled={schools.length === 0}
            required
          >
            {schools.length === 0 ? <option value="">加载中…</option> : null}
            {schools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </AuthSelect>
        </AuthField>

        <AuthField label="学号" htmlFor="register-student-no">
          <AuthInput
            id="register-student-no"
            icon={User}
            value={studentNo}
            onChange={(event) => setStudentNo(event.target.value)}
            inputMode="numeric"
            autoComplete="username"
            placeholder="例如 20210001"
            required
          />
        </AuthField>

        <AuthField label="一次性核验码" htmlFor="register-code" hint={`演示码 ${demoCode}`}>
          <AuthInput
            id="register-code"
            icon={KeyRound}
            value={code}
            onChange={(event) => setCode(event.target.value)}
            autoComplete="one-time-code"
            placeholder="CAMPUS-2026"
            required
          />
        </AuthField>

        <AuthField label="设置密码" htmlFor="register-password" hint="至少 8 位，含字母与数字">
          <AuthInput
            id="register-password"
            icon={Lock}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            placeholder="例如 <REDACTED>"
            required
          />
        </AuthField>

        <AuthField label="确认密码" htmlFor="register-confirm">
          <AuthInput
            id="register-confirm"
            icon={Lock}
            type="password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            autoComplete="new-password"
            placeholder="再输入一次"
            required
          />
        </AuthField>

        <fieldset className="space-y-2.5 pt-1">
          <legend className="mb-2 text-[12px] font-medium text-slate-700">
            分层同意（须逐项勾选）
          </legend>
          {CONSENTS.map((item) => {
            const checked = consents[item.key];
            return (
              <label
                key={item.key}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5 transition-colors duration-200 hover:border-brand/30 has-[:checked]:border-brand/40 has-[:checked]:bg-brand-soft/40"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) =>
                    setConsents((current) => ({ ...current, [item.key]: event.target.checked }))
                  }
                  className="mt-0.5 size-4 shrink-0 rounded border-slate-300 accent-brand"
                />
                <span>
                  <span className="block text-[13px] font-medium text-slate-800">{item.title}</span>
                  <span className="mt-0.5 block text-[11.5px] leading-5 text-slate-500">
                    {item.body}
                  </span>
                </span>
              </label>
            );
          })}
        </fieldset>

        <AuthError message={error} />

        <AuthSubmit loading={loading} loadingText="正在核验…">
          核验并创建账号
          <ArrowRight
            className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
            strokeWidth={2}
            aria-hidden="true"
          />
        </AuthSubmit>
      </form>

      <AuthSwitch prompt="已有账号？" href="/login" label="去登录" />
    </motion.div>
  );
}
