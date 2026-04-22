import { json, requireAdmin, withErrorHandling } from '../../_utils'

export const onRequestGet: PagesFunction = async (context) =>
  withErrorHandling(async () => {
    await requireAdmin(context)
    const rows = await context.env.DB.prepare(
      `
        SELECT
          works.id,
          works.track,
          works.title,
          works.description,
          works.author_name,
          works.external_url,
          works.platform_type,
          works.cover_image_url,
          works.status,
          works.reject_reason,
          works.created_at,
          users.email AS owner_email
        FROM works
        INNER JOIN users ON users.id = works.user_id
        WHERE works.status = 'pending'
        ORDER BY works.created_at ASC
      `,
    ).all<{
      id: string
      track: 'landing' | 'idea'
      title: string
      description: string
      author_name: string
      external_url: string | null
      platform_type: string
      cover_image_url: string | null
      status: 'pending'
      reject_reason: string | null
      created_at: string
      owner_email: string
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
        ownerEmail: row.owner_email,
      })),
    })
  })
