import { hashStudentNo } from "../src/lib/auth/identity";
import { hashPassword } from "../src/lib/auth/password";
import { dateKey, shiftDateKey } from "../src/lib/checkin/streak";
import { config } from "../src/lib/config";
import { pairKeyOf } from "../src/lib/pair";
import { getDb } from "../src/server/db";
import { runMigrations } from "../src/server/migrate";

const DEMO_PASSWORD = "<REDACTED>";
const SCHOOL_ID = "5c000000-0000-4000-8000-000000000001";

interface DemoProfile {
  studentNo: string;
  nickname: string;
  gender: "male" | "female";
  mbti: string;
  zodiac: string;
  hobbies: string[];
  tags: string[];
  bio: string;
  grade: string;
  department: string;
  pref: "same" | "opposite";
}

const DEMO: DemoProfile[] = [
  {
    studentNo: "20210001",
    nickname: "林小满",
    gender: "female",
    mbti: "ENFP",
    zodiac: "gemini",
    hobbies: ["摄影", "咖啡", "旅行"],
    tags: ["幽默", "乐观"],
    bio: "在拍校园里的光影，周末常在图书馆三楼靠窗的位置。",
    grade: "大二",
    department: "新闻传播学院",
    pref: "opposite",
  },
  {
    studentNo: "20210002",
    nickname: "陈一诺",
    gender: "male",
    mbti: "INFP",
    zodiac: "pisces",
    hobbies: ["音乐", "电影", "阅读"],
    tags: ["温和", "慢热"],
    bio: "耳机常驻，最近在补是枝裕和。想找人一起看午夜场。",
    grade: "大三",
    department: "中文系",
    pref: "opposite",
  },
  {
    studentNo: "20210003",
    nickname: "苏辞",
    gender: "female",
    mbti: "INTJ",
    zodiac: "scorpio",
    hobbies: ["健身", "跑步", "咖啡"],
    tags: ["理性", "细心"],
    bio: "每天六点半操场见。计划表爱好者，但也会为一部好剧通宵。",
    grade: "大四",
    department: "计算机学院",
    pref: "opposite",
  },
  {
    studentNo: "20210004",
    nickname: "周予安",
    gender: "male",
    mbti: "ENFJ",
    zodiac: "leo",
    hobbies: ["篮球", "美食", "音乐"],
    tags: ["外向", "自来熟"],
    bio: "球场边的奶茶记录员，擅长把陌生人聊成熟人。",
    grade: "大三",
    department: "体育学院",
    pref: "opposite",
  },
  {
    studentNo: "20210005",
    nickname: "顾晚",
    gender: "female",
    mbti: "ISFP",
    zodiac: "libra",
    hobbies: ["手作", "动漫", "宠物"],
    tags: ["感性", "随性"],
    bio: "在做一本手工书，养了一只叫年糕的猫。",
    grade: "大二",
    department: "设计学院",
    pref: "opposite",
  },
  {
    studentNo: "20210006",
    nickname: "江野",
    gender: "male",
    mbti: "ESTP",
    zodiac: "sagittarius",
    hobbies: ["徒步", "游戏", "旅行"],
    tags: ["乐观", "好奇"],
    bio: "周末不在山里就在去山里的路上，缺一个徒步搭子。",
    grade: "大一",
    department: "地理学院",
    pref: "opposite",
  },
  {
    studentNo: "20210007",
    nickname: "温以宁",
    gender: "female",
    mbti: "ISFJ",
    zodiac: "cancer",
    hobbies: ["美食", "阅读", "咖啡"],
    tags: ["细心", "温和"],
    bio: "会做很好吃的舒芙蕾，也愿意听你讲一晚上烦心事。",
    grade: "大三",
    department: "外国语学院",
    pref: "opposite",
  },
  {
    studentNo: "20210008",
    nickname: "沈知白",
    gender: "male",
    mbti: "ISTJ",
    zodiac: "virgo",
    hobbies: ["健身", "阅读", "电影"],
    tags: ["理性", "内向"],
    bio: "作息规律，喜欢把事情写进日历。最近在读非虚构。",
    grade: "大四",
    department: "经济学院",
    pref: "opposite",
  },
];

async function main(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    console.error("[seed] 拒绝在 production 环境写入演示数据");
    process.exitCode = 1;
    return;
  }

  const db = await getDb();
  await runMigrations(db);

  if (process.argv.includes("--reset")) {
    console.log("[seed] --reset 不会删除正式数据，如需重置请手动删除 .data/pgdata");
  }

  const pepper = config.studentNoPepper;
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const ids = new Map<string, string>();

  for (const profile of DEMO) {
    const hash = hashStudentNo(SCHOOL_ID, profile.studentNo, pepper);
    const existing = await db.withSystem((tx) =>
      tx.query<{ user_id: string }>(
        "select user_id from identity_verifications where school_id = $1 and student_no_hash = $2",
        [SCHOOL_ID, hash],
      ),
    );

    if (existing[0]) {
      ids.set(profile.nickname, existing[0].user_id);
      continue;
    }

    const userId = await db.withSystem(async (tx) => {
      const created = await tx.query<{ id: string }>(
        `insert into users
           (school_id, nickname, gender, grade, department, mbti, zodiac,
            personality_tags, hobbies, bio, match_gender_pref, status, password_hash)
         values ($1, $2, $3::gender_type, $4, $5, $6, $7,
            $8::text[], $9::text[], $10, $11::match_pref, 'matchable', $12)
         returning id`,
        [
          SCHOOL_ID,
          profile.nickname,
          profile.gender,
          profile.grade,
          profile.department,
          profile.mbti,
          profile.zodiac,
          profile.tags,
          profile.hobbies,
          profile.bio,
          profile.pref,
          passwordHash,
        ],
      );
      const id = created[0]!.id;

      await tx.query(
        `insert into identity_verifications (user_id, school_id, student_no_hash)
         values ($1, $2, $3)`,
        [id, SCHOOL_ID, hash],
      );

      for (const scope of ["terms", "privacy", "matching"] as const) {
        await tx.query(
          `insert into consents (user_id, policy_version, scope)
           values ($1, $2, $3::consent_scope)`,
          [id, config.policyVersion, scope],
        );
      }

      return id;
    });

    ids.set(profile.nickname, userId);
  }

  const linnan = ids.get("林小满")!;
  const yinuo = ids.get("陈一诺")!;
  const suci = ids.get("苏辞")!;

  await db.withSystem(async (tx) => {
    for (const partner of [yinuo, suci]) {
      const [a, b] = linnan < partner ? [linnan, partner] : [partner, linnan];
      await tx.query(
        `insert into friendships (user_a, user_b) values ($1, $2)
         on conflict (user_a, user_b) do nothing`,
        [a, b],
      );
      await tx.query(
        `insert into follows (follower_id, followee_id) values ($1, $2), ($2, $1)
         on conflict do nothing`,
        [linnan, partner],
      );
    }

    const [a, b] = linnan < yinuo ? [linnan, yinuo] : [yinuo, linnan];
    const conversation = await tx.query<{ id: string }>(
      `insert into conversations (user_a, user_b) values ($1, $2)
       on conflict (user_a, user_b) do update set closed_at = null
       returning id`,
      [a, b],
    );
    const conversationId = conversation[0]!.id;

    const seeds: [string, string][] = [
      [yinuo, "图书馆三楼今天人好多，你还在吗？"],
      [linnan, "在的，靠窗那个位置。给你带了一杯冰美式。"],
      [yinuo, "太好了，我马上到。"],
    ];

    for (const [index, [sender, content]] of seeds.entries()) {
      await tx.query(
        `insert into messages (conversation_id, sender_id, content, created_at)
         values ($1, $2, $3, now() - ($4 || ' minutes')::interval)`,
        [conversationId, sender, content, String(60 - index * 10)],
      );
    }

    const today = dateKey();
    const pairKey = pairKeyOf(linnan, yinuo);
    for (const offset of [-1, -2]) {
      await tx.query(
        `insert into checkins (pair_key, user_id, partner_id, checkin_date)
         values ($1, $2, $3, $4::date)
         on conflict do nothing`,
        [pairKey, linnan, yinuo, shiftDateKey(today, offset)],
      );
    }
  });

  console.log("[seed] 演示数据就绪");
  console.log(`[seed] 账号：20210001 ~ 20210008，密码：${DEMO_PASSWORD}`);
  console.log("[seed] 登录 20210001（林小满）可以直接体验好友聊天与打卡");

  await db.close();
}

main().catch((error) => {
  console.error("[seed] failed:", error);
  process.exitCode = 1;
});
