import type { AppContext } from './_utils'

interface WorkRow {
  id: string
  track: 'landing' | 'idea'
  title: string
  description: string
  author_name: string
  external_url: string | null
  platform_type: string
  cover_image_url: string | null
  cover_object_key: string | null
  status: 'pending' | 'approved' | 'rejected'
  reject_reason: string | null
  created_at: string
  updated_at: string
  user_id: string
}

interface WorkImageRow {
  image_url: string
  object_key: string
  sort_order: number
}

export async function getWorkById(context: AppContext, workId: string) {
  const work = await context.env.DB.prepare(
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
        cover_object_key,
        status,
        reject_reason,
        created_at,
        updated_at,
        user_id
      FROM works
      WHERE id = ?
      LIMIT 1
    `,
  )
    .bind(workId)
    .first<WorkRow>()

  if (!work) {
    return null
  }

  const imageRows = await context.env.DB.prepare(
    `
      SELECT image_url, object_key, sort_order
      FROM work_images
      WHERE work_id = ?
      ORDER BY sort_order ASC
    `,
  )
    .bind(workId)
    .all<WorkImageRow>()

  return {
    id: work.id,
    track: work.track,
    title: work.title,
    description: work.description,
    authorName: work.author_name,
    externalUrl: work.external_url,
    platformType: work.platform_type,
    coverImageUrl: work.cover_image_url,
    coverObjectKey: work.cover_object_key,
    imageUrls: imageRows.results.map((item) => item.image_url),
    imageObjectKeys: imageRows.results.map((item) => item.object_key),
    status: work.status,
    rejectReason: work.reject_reason,
    createdAt: work.created_at,
    updatedAt: work.updated_at,
    userId: work.user_id,
  }
}
