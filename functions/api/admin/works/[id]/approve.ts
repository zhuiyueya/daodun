import { HttpError, json, requireAdmin, withErrorHandling } from '../../../_utils'

export const onRequestPost: PagesFunction = async (context) =>
  withErrorHandling(async () => {
    await requireAdmin(context)

    const result = await context.env.DB.prepare(
      `
        UPDATE works
        SET status = 'approved', reject_reason = NULL, updated_at = ?
        WHERE id = ?
      `,
    )
      .bind(new Date().toISOString(), context.params.id)
      .run()

    if (!result.success) {
      throw new HttpError(500, '审核通过失败')
    }

    return json({ ok: true })
  })
