import {
  excerptOf,
  moderateText,
  normalizePostMedia,
  type MediaInput,
} from "@/lib/circle/content";
import type {
  AdminPostItem,
  CircleFeed,
  CircleMedia,
  PostCommentItem,
  PostItem,
  PostStatus,
} from "@/lib/types";
import type { CommentInput, PostInput } from "@/lib/validation";
import type { SessionUser } from "../auth";
import { getDb, type Db, type Tx } from "../db";
import { ApiError, assertRateLimit } from "../http";
import { limiters } from "../rate-limits";
import { iso } from "../sql";

const FEED_PAGE_SIZE = 20;

interface PostRow {
  id: string;
  body: string;
  media: CircleMedia[];
  status: PostStatus;
  createdAt: unknown;
  authorId: string;
  nickname: string;
  avatarUrl: string | null;
  mbti: string | null;
  department: string | null;
  likeCount: number;
  commentCount: number;
  liked: boolean;
  following: boolean;
}

function requireCircleMember(user: SessionUser): void {
  if (user.status !== "matchable") {
    throw new ApiError(403, "PROFILE_INCOMPLETE", "完善资料后即可使用校园圈");
  }
}

async function blockedWords(tx: Tx): Promise<string[]> {
  const rows = await tx.query<{ word: string }>("select word from sensitive_words");
  return rows.map((row) => row.word);
}

function toPostItem(row: PostRow, me: string): PostItem {
  return {
    id: row.id,
    body: row.body,
    media: (row.media ?? []) as CircleMedia[],
    status: row.status,
    createdAt: iso(row.createdAt),
    author: {
      id: row.authorId,
      nickname: row.nickname,
      avatarUrl: row.avatarUrl,
      mbti: row.mbti,
      department: row.department,
    },
    likeCount: Number(row.likeCount ?? 0),
    commentCount: Number(row.commentCount ?? 0),
    liked: Boolean(row.liked),
    following: row.authorId === me ? false : Boolean(row.following),
    mine: row.authorId === me,
  };
}

function decodeCursor(cursor: string): { createdAt: string; id: string } | null {
  const separator = cursor.lastIndexOf("|");
  if (separator <= 0) return null;
  const createdAt = cursor.slice(0, separator);
  const id = cursor.slice(separator + 1);
  if (Number.isNaN(Date.parse(createdAt)) || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  return { createdAt, id };
}

/**
 * Same-school timeline. RLS already restricts rows to the caller's school,
 * published posts and non-blocked authors; the query adds ordering, cursors,
 * interaction state and the "following" filter.
 */
export async function listFeed(
  user: SessionUser,
  options: { cursor?: string; scope?: "all" | "following" } = {},
): Promise<CircleFeed> {
  const scope = options.scope === "following" ? "following" : "all";
  const cursor = options.cursor ? decodeCursor(options.cursor) : null;

  const db = await getDb();
  return db.withUser(user.id, async (tx) => {
    const rows = await tx.query<PostRow>(
      `select
         p.id,
         p.body,
         p.media,
         p.status,
         p.created_at as "createdAt",
         p.author_id as "authorId",
         u.nickname,
         u.avatar_url as "avatarUrl",
         u.mbti,
         u.department,
         (select count(*)::int from post_likes l where l.post_id = p.id) as "likeCount",
         (
           select count(*)::int
             from post_comments c
            where c.post_id = p.id and c.status = 'published'
         ) as "commentCount",
         exists (
           select 1 from post_likes l
            where l.post_id = p.id and l.user_id = $1
         ) as liked,
         exists (
           select 1 from follows f
            where f.follower_id = $1 and f.followee_id = p.author_id
         ) as following
       from posts p
       join users u on u.id = p.author_id
      where p.status <> 'removed'
        and ($2::timestamptz is null or (p.created_at, p.id) < ($2::timestamptz, $3::uuid))
        and (
          $4::boolean is false
          or exists (
            select 1 from follows f2
             where f2.follower_id = $1 and f2.followee_id = p.author_id
          )
        )
      order by p.created_at desc, p.id desc
      limit $5`,
      [
        user.id,
        cursor?.createdAt ?? null,
        cursor?.id ?? null,
        scope === "following",
        FEED_PAGE_SIZE + 1,
      ],
    );

    const page = rows.slice(0, FEED_PAGE_SIZE);
    const last = page.at(-1);
    return {
      items: page.map((row) => toPostItem(row, user.id)),
      nextCursor:
        rows.length > FEED_PAGE_SIZE && last ? `${iso(last.createdAt)}|${last.id}` : null,
    };
  });
}

export async function createPost(user: SessionUser, input: PostInput): Promise<PostItem> {
  requireCircleMember(user);
  assertRateLimit(limiters.post.hit(`post:${user.id}`), "发布得太频繁了，休息一下再发");

  const normalized = normalizePostMedia(input.media as MediaInput[]);
  if (!normalized.ok) {
    throw new ApiError(400, "INVALID_MEDIA", normalized.message);
  }

  const body = input.body.trim();
  if (body.length === 0 && normalized.media.length === 0) {
    throw new ApiError(400, "EMPTY_POST", "写点什么，或者配一张图片");
  }
  const db = await getDb();

  const hits = await db.withUser(user.id, async (tx) =>
    moderateText(body, await blockedWords(tx)),
  );
  if (hits.length > 0) {
    throw new ApiError(422, "SENSITIVE_CONTENT", "内容包含不适合发布的词句，请修改后再试", {
      hits,
    });
  }

  const row = await db.withUser(user.id, async (tx) => {
    const rows = await tx.query<{
      id: string;
      body: string;
      media: CircleMedia[];
      status: PostStatus;
      createdAt: unknown;
    }>(
      `insert into posts (author_id, school_id, body, media)
       values ($1, $2, $3, $4::jsonb)
       returning id, body, media, status, created_at as "createdAt"`,
      [user.id, user.schoolId, body, JSON.stringify(normalized.media)],
    );
    return rows[0]!;
  });

  return {
    id: row.id,
    body: row.body,
    media: row.media ?? [],
    status: row.status,
    createdAt: iso(row.createdAt),
    author: {
      id: user.id,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      mbti: user.mbti,
      department: user.department,
    },
    likeCount: 0,
    commentCount: 0,
    liked: false,
    following: false,
    mine: true,
  };
}

export async function removePost(user: SessionUser, postId: string): Promise<{ id: string }> {
  const db = await getDb();
  const rows = await db.withUser(user.id, (tx) =>
    tx.query<{ id: string }>(
      `update posts
          set status = 'removed'
        where id = $1 and author_id = $2 and status <> 'removed'
        returning id`,
      [postId, user.id],
    ),
  );
  if (rows.length === 0) {
    throw new ApiError(404, "POST_NOT_FOUND", "动态不存在或已被删除");
  }
  return { id: rows[0]!.id };
}

export async function setLike(
  user: SessionUser,
  postId: string,
  liked: boolean,
): Promise<{ liked: boolean; likeCount: number }> {
  requireCircleMember(user);
  const db = await getDb();

  return db.withUser(user.id, async (tx) => {
    const post = await tx.query(
      "select 1 from posts where id = $1 and status = 'published'",
      [postId],
    );
    if (post.length === 0) {
      throw new ApiError(404, "POST_NOT_FOUND", "动态不存在或已不可见");
    }

    if (liked) {
      await tx.query(
        `insert into post_likes (post_id, user_id) values ($1, $2)
         on conflict (post_id, user_id) do nothing`,
        [postId, user.id],
      );
    } else {
      await tx.query("delete from post_likes where post_id = $1 and user_id = $2", [
        postId,
        user.id,
      ]);
    }

    const counts = await tx.query<{ count: number }>(
      "select count(*)::int as count from post_likes where post_id = $1",
      [postId],
    );
    return { liked, likeCount: Number(counts[0]?.count ?? 0) };
  });
}

export async function listComments(
  user: SessionUser,
  postId: string,
): Promise<PostCommentItem[]> {
  const db = await getDb();
  return db.withUser(user.id, async (tx) => {
    const post = await tx.query("select 1 from posts where id = $1", [postId]);
    if (post.length === 0) {
      throw new ApiError(404, "POST_NOT_FOUND", "动态不存在或已不可见");
    }

    const rows = await tx.query<{
      id: string;
      body: string;
      createdAt: unknown;
      authorId: string;
      nickname: string;
      avatarUrl: string | null;
    }>(
      `select c.id,
              c.body,
              c.created_at as "createdAt",
              c.author_id as "authorId",
              u.nickname,
              u.avatar_url as "avatarUrl"
         from post_comments c
         join users u on u.id = c.author_id
        where c.post_id = $1 and c.status = 'published'
        order by c.created_at asc, c.id asc
        limit 100`,
      [postId],
    );

    return rows.map((row) => ({
      id: row.id,
      body: row.body,
      createdAt: iso(row.createdAt),
      author: { id: row.authorId, nickname: row.nickname, avatarUrl: row.avatarUrl },
      mine: row.authorId === user.id,
    }));
  });
}

export async function createComment(
  user: SessionUser,
  postId: string,
  input: CommentInput,
): Promise<PostCommentItem> {
  requireCircleMember(user);
  assertRateLimit(limiters.comment.hit(`comment:${user.id}`), "评论得太快了，稍后再试");

  const body = input.body.trim();
  const db = await getDb();

  const hits = await db.withUser(user.id, async (tx) =>
    moderateText(body, await blockedWords(tx)),
  );
  if (hits.length > 0) {
    throw new ApiError(422, "SENSITIVE_CONTENT", "评论包含不适合发布的内容，请修改后再试", {
      hits,
    });
  }

  const row = await db.withUser(user.id, async (tx) => {
    const post = await tx.query(
      "select 1 from posts where id = $1 and status = 'published'",
      [postId],
    );
    if (post.length === 0) {
      throw new ApiError(404, "POST_NOT_FOUND", "动态不存在或已不可见");
    }

    const rows = await tx.query<{ id: string; createdAt: unknown }>(
      `insert into post_comments (post_id, author_id, body)
       values ($1, $2, $3)
       returning id, created_at as "createdAt"`,
      [postId, user.id, body],
    );
    return rows[0]!;
  });

  return {
    id: row.id,
    body,
    createdAt: iso(row.createdAt),
    author: { id: user.id, nickname: user.nickname, avatarUrl: user.avatarUrl },
    mine: true,
  };
}

export async function removeComment(
  user: SessionUser,
  postId: string,
  commentId: string,
): Promise<{ id: string }> {
  const db = await getDb();
  const rows = await db.withUser(user.id, (tx) =>
    tx.query<{ id: string }>(
      `delete from post_comments
        where id = $1 and post_id = $2 and author_id = $3
        returning id`,
      [commentId, postId, user.id],
    ),
  );
  if (rows.length === 0) {
    throw new ApiError(404, "COMMENT_NOT_FOUND", "评论不存在或无权删除");
  }
  return { id: rows[0]!.id };
}

// ---------------------------------------------------------------------------
// 管理端
// ---------------------------------------------------------------------------

export async function listAdminPosts(limit = 50): Promise<AdminPostItem[]> {
  const db = await getDb();
  return db.withSystem(async (tx) => {
    const rows = await tx.query<{
      id: string;
      body: string;
      media: CircleMedia[];
      status: PostStatus;
      createdAt: unknown;
      authorId: string;
      nickname: string;
      likeCount: number;
      commentCount: number;
    }>(
      `select p.id,
              p.body,
              p.media,
              p.status,
              p.created_at as "createdAt",
              p.author_id as "authorId",
              u.nickname,
              (select count(*)::int from post_likes l where l.post_id = p.id) as "likeCount",
              (
                select count(*)::int from post_comments c
                 where c.post_id = p.id and c.status = 'published'
              ) as "commentCount"
         from posts p
         join users u on u.id = p.author_id
        order by p.created_at desc, p.id desc
        limit $1`,
      [limit],
    );

    return rows.map((row) => ({
      id: row.id,
      body: row.body,
      media: row.media ?? [],
      status: row.status,
      createdAt: iso(row.createdAt),
      author: { id: row.authorId, nickname: row.nickname },
      likeCount: Number(row.likeCount ?? 0),
      commentCount: Number(row.commentCount ?? 0),
    }));
  });
}

export async function moderatePost(
  postId: string,
  action: "hide" | "restore" | "remove",
): Promise<{ id: string; status: PostStatus }> {
  const status: PostStatus =
    action === "hide" ? "hidden" : action === "remove" ? "removed" : "published";

  const db = await getDb();
  const rows = await db.withSystem((tx) =>
    tx.query<{ id: string; status: PostStatus }>(
      "update posts set status = $2::post_status where id = $1 returning id, status",
      [postId, status],
    ),
  );
  if (rows.length === 0) throw new ApiError(404, "POST_NOT_FOUND", "动态不存在");
  return rows[0]!;
}

/** Called when an account is banned: its published posts leave the timeline. */
export async function hidePostsOfAuthor(db: Db, authorId: string): Promise<void> {
  await db.withSystem((tx) =>
    tx.query(
      `update posts set status = 'hidden'
        where author_id = $1 and status = 'published'`,
      [authorId],
    ),
  );
}

export function previewOfPost(body: string): string {
  return excerptOf(body) || "（无文字内容）";
}
