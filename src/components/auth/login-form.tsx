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

export function LoginForm({ banned }: { banned: boolean }) {
  const router = useRouter();
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolId, setSchoolId] = useState("");
  const [studentNo, setStudentNo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(banned ? "该账号已被封禁，如有疑问请联系管理员" : null);
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
      router.replace(result.status === "matchable" ? "/match" : "/profile");
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause));
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-[26px] font-semibold tracking-tight text-ink">欢迎回来</h1>
      <p className="mt-2 text-[13px] leading-6 text-muted">
        用注册时的学校与学号登录。学号只用于核验，不会出现在任何页面。
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

        <Field label="学号">
          <Input
            value={studentNo}
            onChange={(event) => setStudentNo(event.target.value)}
            inputMode="numeric"
            autoComplete="username"
            placeholder="例如 20210001"
            required
          />
        </Field>

        <Field label="密码">
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            placeholder="注册时设置的密码"
            required
          />
        </Field>

        {error ? <Banner>{error}</Banner> : null}

        <Button type="submit" loading={loading} className="w-full">
          登录
        </Button>
      </form>

      <p className="mt-6 text-center text-[13px] text-muted">
        还没有账号？
        <Link href="/register" className="ml-1 font-medium text-brand">
          去注册
        </Link>
      </p>
    </div>
  );
}
