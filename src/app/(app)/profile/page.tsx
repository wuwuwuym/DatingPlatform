"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  GENDER_OPTIONS,
  HOBBIES,
  MATCH_PREF_OPTIONS,
  MBTI_TYPES,
  PERSONALITY_TAGS,
  ZODIAC_SIGNS,
} from "@/lib/constants";
import { api, errorMessage } from "@/lib/api-client";
import { fileToAvatarDataUrl } from "@/lib/image";
import type { Gender, MatchPref, MyProfile } from "@/lib/types";
import {
  Avatar,
  Badge,
  Banner,
  Button,
  Card,
  Chip,
  Field,
  Input,
  SectionTitle,
  Spinner,
  Textarea,
} from "@/components/ui";

interface Draft {
  nickname: string;
  avatarUrl: string | null;
  gender: Gender | null;
  grade: string;
  department: string;
  mbti: string | null;
  zodiac: string | null;
  personalityTags: string[];
  hobbies: string[];
  bio: string;
  matchGenderPref: MatchPref | null;
}

function toDraft(profile: MyProfile): Draft {
  return {
    nickname: profile.nickname,
    avatarUrl: profile.avatarUrl,
    gender: profile.gender,
    grade: profile.grade ?? "",
    department: profile.department ?? "",
    mbti: profile.mbti,
    zodiac: profile.zodiac,
    personalityTags: profile.personalityTags,
    hobbies: profile.hobbies,
    bio: profile.bio,
    matchGenderPref: profile.matchGenderPref,
  };
}

function toggle(list: string[], value: string, max: number): string[] {
  if (list.includes(value)) return list.filter((item) => item !== value);
  if (list.length >= max) return list;
  return [...list, value];
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api<{ profile: MyProfile }>("/api/profile")
      .then(({ profile }) => {
        setProfile(profile);
        setDraft(toDraft(profile));
      })
      .catch((cause) => setError(errorMessage(cause)));
  }, []);

  if (!draft || !profile) {
    return (
      <div className="flex justify-center py-20 text-muted">
        {error ? <Banner>{error}</Banner> : <Spinner className="text-brand" />}
      </div>
    );
  }

  const isMatchable = profile.status === "matchable";
  const update = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => (current ? { ...current, [key]: value } : current));

  async function save(complete: boolean) {
    if (!draft) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const result = await api<{ profile: MyProfile; missing: string[]; promoted: boolean }>(
        "/api/profile",
        {
          method: "PUT",
          body: {
            nickname: draft.nickname.trim(),
            avatarUrl: draft.avatarUrl,
            gender: draft.gender,
            grade: draft.grade.trim() || null,
            department: draft.department.trim() || null,
            mbti: draft.mbti,
            zodiac: draft.zodiac,
            personalityTags: draft.personalityTags,
            hobbies: draft.hobbies,
            bio: draft.bio.trim(),
            matchGenderPref: draft.matchGenderPref,
            complete,
          },
        },
      );
      setProfile(result.profile);
      setMissing(result.missing);
      setNotice(
        result.promoted
          ? "已加入同校匹配池，去看看谁和你同频。"
          : complete
            ? "资料已保存。"
            : "资料已保存。",
      );
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[24px] font-semibold tracking-tight">{isMatchable ? "我的资料" : "完善你的资料"}</h1>
        <p className="mt-2 text-[13px] leading-6 text-muted">
          {isMatchable
            ? "资料随时可改，改动会同步到之后的匹配推荐。"
            : "完成必填项后即可进入同校匹配池，其余同学才能看到你。"}
        </p>
      </header>

      {!isMatchable ? (
        <Card className="space-y-2 bg-brand-soft/60">
          <p className="text-[13px] font-medium text-brand">进入匹配池还需要</p>
          <div className="flex flex-wrap gap-1.5">
            {(missing.length > 0
              ? missing
              : ["昵称", "性别", "MBTI", "星座", "爱好", "性格标签", "配对偏好"]
            ).map((item) => (
              <Badge key={item} tone="brand">
                {item}
              </Badge>
            ))}
          </div>
        </Card>
      ) : (
        <Card className="flex items-center justify-between">
          <div>
            <p className="text-[13px] font-medium text-ink">已在匹配池中</p>
            <p className="mt-1 text-[11.5px] text-muted">匹配推荐每天都会刷新</p>
          </div>
          <Link href="/match" className="rounded-xl bg-brand px-3.5 py-2 text-[12.5px] font-medium text-white">
            去发现
          </Link>
        </Card>
      )}

      <Card className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar name={draft.nickname || "同"} src={draft.avatarUrl} size={64} />
          <div className="flex-1">
            <p className="text-[13px] font-medium text-ink">头像</p>
            <p className="mt-0.5 text-[11.5px] text-muted">本地上传，压缩后随资料保存，可选</p>
          </div>
          <Button variant="secondary" className="px-3 py-2 text-[12px]" onClick={() => fileRef.current?.click()}>
            上传
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              try {
                update("avatarUrl", await fileToAvatarDataUrl(file));
              } catch (cause) {
                setError(errorMessage(cause));
              }
            }}
          />
        </div>

        <Field label="昵称" hint="最多 16 字">
          <Input
            value={draft.nickname}
            maxLength={16}
            onChange={(event) => update("nickname", event.target.value)}
            placeholder="想让同学怎么称呼你"
          />
        </Field>

        <Field label="性别">
          <div className="flex gap-2">
            {GENDER_OPTIONS.map((option) => (
              <Chip
                key={option.value}
                selected={draft.gender === option.value}
                onClick={() => update("gender", option.value)}
              >
                {option.label}
              </Chip>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="年级" hint="可选">
            <Input
              value={draft.grade}
              onChange={(event) => update("grade", event.target.value)}
              placeholder="大二"
              maxLength={20}
            />
          </Field>
          <Field label="院系" hint="可选">
            <Input
              value={draft.department}
              onChange={(event) => update("department", event.target.value)}
              placeholder="计算机学院"
              maxLength={40}
            />
          </Field>
        </div>

        <Field label="简介" hint="最多 200 字">
          <Textarea
            value={draft.bio}
            rows={3}
            maxLength={200}
            onChange={(event) => update("bio", event.target.value)}
            placeholder="一句话介绍自己，比如最近在追什么剧、在学什么"
          />
        </Field>
      </Card>

      <Card className="space-y-4">
        <SectionTitle>匹配特质</SectionTitle>
        <p className="-mt-2 text-[11.5px] leading-5 text-muted">
          这些信息只用于同校匹配计算，不会展示给校外任何人。
        </p>

        <Field label="MBTI">
          <select
            className="field-input"
            value={draft.mbti ?? ""}
            onChange={(event) => update("mbti", event.target.value || null)}
          >
            <option value="">请选择</option>
            {MBTI_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </Field>

        <Field label="星座">
          <select
            className="field-input"
            value={draft.zodiac ?? ""}
            onChange={(event) => update("zodiac", event.target.value || null)}
          >
            <option value="">请选择</option>
            {ZODIAC_SIGNS.map((sign) => (
              <option key={sign.value} value={sign.value}>
                {sign.label}
              </option>
            ))}
          </select>
        </Field>

        <div>
          <p className="mb-2 text-[13px] font-medium text-ink-soft">
            性格标签 <span className="text-[11px] font-normal text-muted">最多 8 个</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {PERSONALITY_TAGS.map((tag) => (
              <Chip
                key={tag}
                selected={draft.personalityTags.includes(tag)}
                onClick={() => update("personalityTags", toggle(draft.personalityTags, tag, 8))}
              >
                {tag}
              </Chip>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-[13px] font-medium text-ink-soft">
            爱好 <span className="text-[11px] font-normal text-muted">最多 8 个</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {HOBBIES.map((hobby) => (
              <Chip
                key={hobby}
                selected={draft.hobbies.includes(hobby)}
                onClick={() => update("hobbies", toggle(draft.hobbies, hobby, 8))}
              >
                {hobby}
              </Chip>
            ))}
          </div>
        </div>
      </Card>

      <Card className="space-y-4">
        <SectionTitle>配对偏好</SectionTitle>
        <p className="-mt-2 text-[11.5px] leading-5 text-muted">
          MVP 只提供「同性/异性」两档，暂不支持「不限」。
        </p>
        <div className="flex gap-2">
          {MATCH_PREF_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              selected={draft.matchGenderPref === option.value}
              onClick={() => update("matchGenderPref", option.value)}
            >
              {option.label}
            </Chip>
          ))}
        </div>
      </Card>

      {error ? <Banner>{error}</Banner> : null}
      {notice ? <Banner tone="success">{notice}</Banner> : null}
      {notice && missing.length > 0 ? (
        <Banner tone="info">还差这些必填项：{missing.join("、")}</Banner>
      ) : null}

      <div className="flex gap-3 pb-2">
        <Button variant="secondary" className="flex-1" loading={saving} onClick={() => save(false)}>
          保存
        </Button>
        <Button className="flex-[1.4]" loading={saving} onClick={() => save(true)}>
          {isMatchable ? "保存资料" : "保存并进入匹配池"}
        </Button>
      </div>
    </div>
  );
}
