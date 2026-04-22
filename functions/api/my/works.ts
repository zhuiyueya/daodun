import { json, requireUser, withErrorHandling } from '../_utils'

export const onRequestGet: PagesFunction = async (context) =>
  withErrorHandling(async () => {
    const user = await requireUser(context)
    const rows = await context.env.DB.prepare(
      `
        SELECT
          id,
          track,
          title,
          description,
          author_name,
          external_url,
          platform_type,
          cover_image_url,
          status,
          reject_reason,
          created_at
        FROM works
        WHERE user_id = ?
        ORDER BY created_at DESC
      `,
    )
      .bind(user.id)
      .all<{
        id: string
        track: 'landing' | 'idea'
        title: string
        description: string
        author_name: string
        external_url: string | null
        platform_type: string
        cover_image_url: string | null
        status: 'pending' | 'approved' | 'rejected'
        reject_reason: string | null
        created_at: string
      }>()

    return json({
      works: rows.results.map((row) => ({
        id: row.id,
        track: row.track,
        title: row.title,
        description: row.description,
        authorName: row.author_name,
        externalUrl: row.external_url,
        platformType: row.platform_type,
        coverImageUrl: row.cover_image_url,
        status: row.status,
        rejectReason: row.reject_reason,
        createdAt: row.created_at,
      })),
    })
  })
