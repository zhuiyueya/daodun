import {
  json,
  requireUser,
  withErrorHandling,
} from '../_utils'

export const onRequestGet: PagesFunction = async (context) =>
  withErrorHandling(async () => {
    const user = await requireUser(context)

    const rows = await context.env.DB.prepare(
      'SELECT work_id FROM votes WHERE user_id = ?',
    )
      .bind(user.id)
      .all<{ work_id: string }>()

    return json({
      votedWorkIds: rows.results.map((r) => r.work_id),
      remainingVotes: 3 - rows.results.length,
    })
  })
