import { RegisterForm } from "@/components/auth/register-form";
import { config } from "@/lib/config";

export default function RegisterPage() {
  return <RegisterForm demoCode={config.demoVerificationCode} />;
}
