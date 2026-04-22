import { HttpError, json, parseJson, requireAdmin, withErrorHandling } from '../../../_utils'

interface RejectBody {
  reason?: string
}

export const onRequestPost: PagesFunction = async (context) =>
  withErrorHandling(async () => {
    await requireAdmin(context)
    const body = await parseJson<RejectBody>(context.request)
    const reason = (body.reason ?? '').trim()

    const result = await context.env.DB.prepare(
      `
        UPDATE works
        SET status = 'rejected', reject_reason = ?, updated_at = ?
        WHERE id = ?
      `,
    )
      .bind(reason || '管理员已驳回', new Date().toISOString(), context.params.id)
      .run()

    if (!result.success) {
      throw new HttpError(500, '驳回失败')
    }

    return json({ ok: true })
  })
