import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/landing-page";
import { getSessionUser } from "@/server/auth";
import { getLandingData } from "@/server/services/landing-service";

export const metadata: Metadata = {
  title: "校园同频 · 不必合群，遇见同频就好",
  description:
    "只对同校大学生开放的轻社交平台。用兴趣认识同学，学生身份认证，互关才可聊天，隐私随时可控。",
};

export default async function HomePage() {
  const user = await getSessionUser();
  const data = await getLandingData(user);
  const destination = user
    ? user.status === "matchable"
      ? "/match"
      : "/profile"
    : "/register";

  return (
    <LandingPage
      signedIn={Boolean(user)}
      destination={destination}
      students={data.students}
      mode={data.mode}
    />
  );
}
