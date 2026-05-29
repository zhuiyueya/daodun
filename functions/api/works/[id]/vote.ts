import {
  HttpError,
  assertMethod,
  json,
  nowIso,
  requireUser,
  withErrorHandling,
} from '../../_utils'

export const onRequestPost: PagesFunction = async (context) =>
  withErrorHandling(async () => {
    assertMethod(context.request, 'POST')
    const user = await requireUser(context)
    const workId = context.params.id as string

    const work = await context.env.DB.prepare(
      'SELECT id, user_id, status FROM works WHERE id = ? LIMIT 1',
    )
      .bind(workId)
      .first<{ id: string; user_id: string; status: string }>()

    if (!work || work.status !== 'approved') {
      throw new HttpError(404, '作品不存在或未通过审核')
    }

    if (work.user_id === user.id) {
      throw new HttpError(400, '不能投票给自己的作品')
    }

    const existing = await context.env.DB.prepare(
      'SELECT id FROM votes WHERE user_id = ? AND work_id = ? LIMIT 1',
    )
      .bind(user.id, workId)
      .first<{ id: string }>()

    if (existing) {
      throw new HttpError(400, '已经投过这个作品了')
    }

    const voteCount = await context.env.DB.prepare(
      'SELECT COUNT(*) AS count FROM votes WHERE user_id = ?',
    )
      .bind(user.id)
      .first<{ count: number }>()

    if ((voteCount?.count ?? 0) >= 3) {
      throw new HttpError(400, '投票机会已用完（最多 3 票）')
    }

    await context.env.DB.prepare(
      'INSERT INTO votes (id, user_id, work_id, created_at) VALUES (?, ?, ?, ?)',
    )
      .bind(crypto.randomUUID(), user.id, workId, nowIso())
      .run()

    const total = await context.env.DB.prepare(
      'SELECT COUNT(*) AS count FROM votes WHERE work_id = ?',
    )
      .bind(workId)
      .first<{ count: number }>()

    return json({ ok: true, voteCount: total?.count ?? 0 })
  })
