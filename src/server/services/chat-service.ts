import { findSensitiveWords } from "@/lib/chat/sensitive";
import type {
  ChatNotification,
  ConversationItem,
  MessageItem,
  PublicProfile,
} from "@/lib/types";
import type { SessionUser } from "../auth";
import { getDb, type Tx } from "../db";
import { ApiError } from "../http";
import { iso, PROFILE_COLUMNS } from "../sql";

interface ConversationRow {
  id: string;
  userA: string;
  userB: string;
  closedAt: unknown;
}

async function getConversation(tx: Tx, convId: string): Promise<ConversationRow | null> {
  const rows = await tx.query<ConversationRow>(
    `select id, user_a as "userA", user_b as "userB", closed_at as "closedAt"
       from conversations
      where id = $1`,
    [convId],
  );
  return rows[0] ?? null;
}

export async function listConversations(user: SessionUser): Promise<ConversationItem[]> {
  const db = await getDb();
  return db.withUser(user.id, async (tx) => {
    const rows = await tx.query<
      PublicProfile & {
        conversationId: string;
        closedAt: unknown;
        lastContent: string | null;
        lastCreatedAt: unknown;
        lastSenderId: string | null;
        unreadCount: number;
      }
    >(
      `select
         c.id as "conversationId",
         c.closed_at as "closedAt",
         ${PROFILE_COLUMNS},
         lm.content as "lastContent",
         lm.created_at as "lastCreatedAt",
         lm.sender_id as "lastSenderId",
         (
           select count(*)::int
             from messages m2
            where m2.conversation_id = c.id
              and m2.sender_id <> $1
              and m2.created_at > coalesce(
                case when c.user_a = $1 then c.user_a_last_read_at else c.user_b_last_read_at end,
                'epoch'::timestamptz
              )
         ) as "unreadCount"
       from conversations c
       join users u on u.id = case when c.user_a = $1 then c.user_b else c.user_a end
       join schools s on s.id = u.school_id
       left join lateral (
         select content, created_at, sender_id
           from messages
          where conversation_id = c.id
          order by created_at desc, id desc
          limit 1
       ) lm on true
       where c.user_a = $1 or c.user_b = $1
       order by coalesce(lm.created_at, c.created_at) desc`,
      [user.id],
    );

    return rows.map((row) => ({
      id: row.conversationId,
      partner: {
        id: row.id,
        nickname: row.nickname,
        avatarUrl: row.avatarUrl,
        gender: row.gender,
        grade: row.grade,
        department: row.department,
        mbti: row.mbti,
        zodiac: row.zodiac,
        personalityTags: row.personalityTags,
        hobbies: row.hobbies,
        bio: row.bio,
        schoolName: row.schoolName,
      },
      lastMessage: row.lastContent
        ? {
            content: row.lastContent,
            createdAt: iso(row.lastCreatedAt),
            mine: row.lastSenderId === user.id,
          }
        : null,
      unreadCount: Number(row.unreadCount ?? 0),
      closed: row.closedAt !== null,
    }));
  });
}

export async function listMessageNotifications(
  user: SessionUser,
  after: string,
): Promise<ChatNotification[]> {
  const db = await getDb();
  return db.withUser(user.id, async (tx) => {
    const rows = await tx.query<{
      conversationId: string;
      messageId: string;
      content: string;
      createdAt: unknown;
      partnerId: string;
      nickname: string;
      avatarUrl: string | null;
    }>(
      `select
         c.id as "conversationId",
         m.id as "messageId",
         m.content,
         m.created_at as "createdAt",
         u.id as "partnerId",
         u.nickname,
         u.avatar_url as "avatarUrl"
       from messages m
       join conversations c on c.id = m.conversation_id
       join users u on u.id = case when c.user_a = $1 then c.user_b else c.user_a end
      where (c.user_a = $1 or c.user_b = $1)
        and m.sender_id <> $1
        and m.created_at > $2::timestamptz
      order by m.created_at asc, m.id asc
      limit 20`,
      [user.id, after],
    );

    return rows.map((row) => ({
      conversationId: row.conversationId,
      partner: {
        id: row.partnerId,
        nickname: row.nickname,
        avatarUrl: row.avatarUrl,
      },
      message: {
        id: row.messageId,
        content: row.content,
        createdAt: iso(row.createdAt),
      },
    }));
  });
}

export async function openConversation(
  user: SessionUser,
  partnerId: string,
): Promise<{ id: string }> {
  if (partnerId === user.id) {
    throw new ApiError(400, "INVALID_PARTNER", "不能和自己聊天");
  }
  const db = await getDb();

  const friends = await db.withUser(user.id, (tx) =>
    tx.query(
      `select 1 from friendships
        where user_a = least($1::uuid, $2::uuid)
          and user_b = greatest($1::uuid, $2::uuid)`,
      [user.id, partnerId],
    ),
  );
  if (friends.length === 0) {
    throw new ApiError(403, "NOT_FRIENDS", "只有互相关注成为好友后才能私聊");
  }

  const partner = await db.withSystem((tx) =>
    tx.query<{ status: string }>("select status from users where id = $1", [partnerId]),
  );
  if (!partner[0] || partner[0].status === "banned") {
    throw new ApiError(403, "PARTNER_UNAVAILABLE", "对方账号当前不可用");
  }

  const id = await db.withSystem(async (tx) => {
    const rows = await tx.query<{ id: string; closedAt: unknown }>(
      `insert into conversations (user_a, user_b)
       values (least($1::uuid, $2::uuid), greatest($1::uuid, $2::uuid))
       on conflict (user_a, user_b) do update set closed_at = null
       returning id, closed_at as "closedAt"`,
      [user.id, partnerId],
    );
    return rows[0]!.id;
  });

  return { id };
}

export async function listMessages(
  user: SessionUser,
  convId: string,
  options: { after?: string; markRead?: boolean } = {},
): Promise<MessageItem[]> {
  const db = await getDb();
  return db.withUser(user.id, async (tx) => {
    const conversation = await getConversation(tx, convId);
    if (!conversation) {
      throw new ApiError(404, "CONVERSATION_NOT_FOUND", "会话不存在或无权访问");
    }

    let rows: { id: string; content: string; createdAt: unknown; senderId: string }[];

    if (options.after) {
      rows = await tx.query<{
        id: string;
        content: string;
        createdAt: unknown;
        senderId: string;
      }>(
        `select id, content, created_at as "createdAt", sender_id as "senderId"
           from messages
          where conversation_id = $1 and created_at > $2::timestamptz
          order by created_at asc, id asc
          limit 100`,
        [convId, options.after],
      );
    } else {
      const latest = await tx.query<{
        id: string;
        content: string;
        createdAt: unknown;
        senderId: string;
      }>(
        `select id, content, created_at as "createdAt", sender_id as "senderId"
           from messages
          where conversation_id = $1
          order by created_at desc, id desc
          limit 100`,
        [convId],
      );
      rows = [...latest].reverse();
    }

    if (options.markRead !== false) {
      await touchRead(tx, conversation, user.id);
    }

    return rows.map((row) => ({
      id: row.id,
      content: row.content,
      createdAt: iso(row.createdAt),
      mine: row.senderId === user.id,
    }));
  });
}

async function touchRead(tx: Tx, conversation: ConversationRow, userId: string): Promise<void> {
  const column =
    conversation.userA === userId ? "user_a_last_read_at" : "user_b_last_read_at";
  await tx.query(`update conversations set ${column} = now() where id = $1`, [conversation.id]);
}

export async function markRead(user: SessionUser, convId: string): Promise<void> {
  const db = await getDb();
  await db.withUser(user.id, async (tx) => {
    const conversation = await getConversation(tx, convId);
    if (!conversation) return;
    await touchRead(tx, conversation, user.id);
  });
}

export async function sendMessage(
  user: SessionUser,
  convId: string,
  content: string,
): Promise<MessageItem> {
  const trimmed = content.trim();
  if (trimmed.length === 0) {
    throw new ApiError(400, "EMPTY_MESSAGE", "消息不能为空");
  }

  const db = await getDb();

  const conversation = await db.withUser(user.id, (tx) => getConversation(tx, convId));
  if (!conversation) {
    throw new ApiError(404, "CONVERSATION_NOT_FOUND", "会话不存在或无权访问");
  }
  if (conversation.closedAt !== null) {
    throw new ApiError(403, "CONVERSATION_CLOSED", "会话已关闭，无法继续发送消息");
  }

  const partnerId = conversation.userA === user.id ? conversation.userB : conversation.userA;

  const friends = await db.withUser(user.id, (tx) =>
    tx.query(
      `select 1 from friendships
        where user_a = least($1::uuid, $2::uuid)
          and user_b = greatest($1::uuid, $2::uuid)`,
      [user.id, partnerId],
    ),
  );
  if (friends.length === 0) {
    throw new ApiError(403, "NOT_FRIENDS", "只有好友之间才能发送消息");
  }

  const partner = await db.withSystem((tx) =>
    tx.query<{ status: string }>("select status from users where id = $1", [partnerId]),
  );
  if (!partner[0] || partner[0].status === "banned") {
    throw new ApiError(403, "PARTNER_UNAVAILABLE", "对方账号当前不可用");
  }

  const words = await db.withUser(user.id, (tx) =>
    tx.query<{ word: string }>("select word from sensitive_words", []),
  );
  const hits = findSensitiveWords(trimmed, words.map((row) => row.word));
  if (hits.length > 0) {
    throw new ApiError(422, "SENSITIVE_CONTENT", "消息包含不适合发送的内容，请修改后再试", {
      hits,
    });
  }

  const message = await db.withUser(user.id, async (tx) => {
    const rows = await tx.query<{
      id: string;
      content: string;
      createdAt: unknown;
      senderId: string;
    }>(
      `insert into messages (conversation_id, sender_id, content)
       values ($1, $2, $3)
       returning id, content, created_at as "createdAt", sender_id as "senderId"`,
      [convId, user.id, trimmed],
    );
    await touchRead(tx, conversation, user.id);
    return rows[0]!;
  });

  return {
    id: message.id,
    content: message.content,
    createdAt: iso(message.createdAt),
    mine: true,
  };
}
