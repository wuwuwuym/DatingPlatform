import { getDevAdminPasscode } from "../src/lib/config";

if (process.env.CI) {
  console.error("[admin] 禁止在 CI 中输出管理口令；请只在本地终端运行。");
  process.exit(1);
}

const passcode = getDevAdminPasscode();

if (!passcode) {
  console.error(
    "[admin] 当前为 production 环境，请通过环境变量 ADMIN_PASSCODE 配置管理口令。",
  );
  process.exitCode = 1;
} else {
  console.log(`本地管理口令：${passcode}`);
  console.log("（来自 .data/dev-secrets.json，不会提交到版本库）");
}
