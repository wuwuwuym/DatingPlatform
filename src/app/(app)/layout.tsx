import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { getSessionUser } from "@/server/auth";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.status === "banned") redirect("/login?banned=1");

  return (
    <AppShell
      nickname={user.nickname}
      avatarUrl={user.avatarUrl}
      schoolName={user.schoolName}
      status={user.status}
    >
      {children}
    </AppShell>
  );
}
