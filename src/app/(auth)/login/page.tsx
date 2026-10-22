import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ banned?: string }>;
}) {
  const { banned } = await searchParams;
  return <LoginForm banned={banned === "1"} />;
}
