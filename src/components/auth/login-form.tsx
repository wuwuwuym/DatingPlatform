"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, GraduationCap, Lock, ShieldCheck, User } from "lucide-react";
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

export function LoginForm({ banned }: { banned: boolean }) {
  const reduce = useReducedMotion();
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolId, setSchoolId] = useState("");
  const [studentNo, setStudentNo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    banned ? "该账号已被封禁，如有疑问请联系管理员" : null,
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api<{ schools: School[] }>("/api/auth/schools")
      .then((data) => {
        setSchools(data.schools);
        setSchoolId((current) => current || data.schools[0]?.id || "");
      })
      .catch((cause) => setError(errorMessage(cause)));
  }, []);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await api<{ status: string }>("/api/auth/login", {
        body: { schoolId, studentNo, password },
      });
      // A full navigation guarantees the new session cookie is picked up by the
      // server tree and avoids racing the client router cache after sign-in.
      window.location.assign(result.status === "matchable" ? "/match" : "/profile");
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
        <h1 className="text-[32px] font-bold leading-tight tracking-[-0.03em] text-slate-900 sm:text-[34px]">
          欢迎回来
        </h1>
        <p className="mt-2.5 text-[13px] leading-6 text-slate-500">
          好久不见，回到同频，继续遇见合拍的校园伙伴。
        </p>
      </header>

      <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-brand-soft/70 px-3.5 py-3 text-[12px] leading-5 text-slate-600">
        <ShieldCheck
          className="mt-0.5 size-4 shrink-0 text-brand"
          strokeWidth={1.8}
          aria-hidden="true"
        />
        <span>你的学号仅用于校内身份核验，绝对保护隐私</span>
      </div>

      <form onSubmit={onSubmit} className="mt-7 space-y-4">
        <AuthField label="学校" htmlFor="login-school">
          <AuthSelect
            id="login-school"
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

        <AuthField label="学号" htmlFor="login-student-no">
          <AuthInput
            id="login-student-no"
            icon={User}
            value={studentNo}
            onChange={(event) => setStudentNo(event.target.value)}
            inputMode="numeric"
            autoComplete="username"
            placeholder="例如 20210001"
            required
          />
        </AuthField>

        <AuthField label="密码" htmlFor="login-password">
          <AuthInput
            id="login-password"
            icon={Lock}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            placeholder="注册时设置的密码"
            required
          />
        </AuthField>

        <AuthError message={error} />

        <AuthSubmit loading={loading} loadingText="正在登录…">
          登录
          <ArrowRight
            className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
            strokeWidth={2}
            aria-hidden="true"
          />
        </AuthSubmit>
      </form>

      <AuthSwitch prompt="还没有账号？" href="/register" label="去注册" />
    </motion.div>
  );
}
