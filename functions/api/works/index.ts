import {
  HttpError,
  assertMethod,
  assertStoredAsset,
  assertStoredAssets,
  json,
  nowIso,
  parseJson,
  requireUser,
  withErrorHandling,
} from '../_utils'

interface SubmitWorkBody {
  track?: 'landing' | 'idea'
  title?: string
  description?: string
  authorName?: string
  externalUrl?: string | null
  platformType?: string
  coverImage?: {
    url: string
    objectKey: string
  } | null
  images?: Array<{
    url: string
    objectKey: string
  }>
}

const allowedPlatformTypes = ['none', 'website', 'douyin', 'bilibili', 'offline_app', 'other']

export const onRequestGet: PagesFunction = async (context) =>
  withErrorHandling(async () => {
    const url = new URL(context.request.url)
    const track = url.searchParams.get('track') ?? 'all'

    if (!['all', 'landing', 'idea'].includes(track)) {
      throw new HttpError(400, '赛道参数不合法')
    }

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
          created_at
        FROM works
        WHERE status = 'approved'
          AND (? = 'all' OR track = ?)
        ORDER BY created_at DESC
      `,
    )
      .bind(track, track)
      .all<{
        id: string
        track: 'landing' | 'idea'
        title: string
        description: string
        author_name: string
        external_url: string | null
        platform_type: string
        cover_image_url: string | null
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
        createdAt: row.created_at,
      })),
    })
  })

export const onRequestPost: PagesFunction = async (context) =>
  withErrorHandling(async () => {
    assertMethod(context.request, 'POST')
    const user = await requireUser(context)
    const body = await parseJson<SubmitWorkBody>(context.request)
    const track = body.track
    const title = (body.title ?? '').trim()
    const description = (body.description ?? '').trim()
    const authorName = (body.authorName ?? '').trim()
    const externalUrl = (body.externalUrl ?? '').trim()
    const platformType = body.platformType ?? 'none'

    if (track !== 'landing' && track !== 'idea') {
      throw new HttpError(400, '请选择赛道')
    }

    if (!title || title.length > 30) {
      throw new HttpError(400, '作品标题不能为空且不能超过 30 个字')
    }

    if (!description || description.length > 1200) {
      throw new HttpError(400, '作品说明不能为空且不能超过 1200 个字')
    }

    if (!authorName || authorName.length > 15) {
      throw new HttpError(400, '作者名称不能为空且不能超过 15 个字')
    }

    if (!allowedPlatformTypes.includes(platformType)) {
      throw new HttpError(400, '链接类型不合法')
    }

    if (track === 'landing' && !externalUrl) {
      throw new HttpError(400, '落地作品请填写作品链接')
    }

    const workCount = await context.env.DB.prepare(
      `
        SELECT COUNT(*) AS count
        FROM works
        WHERE user_id = ?
      `,
    )
      .bind(user.id)
      .first<{ count: number }>()

    if ((workCount?.count ?? 0) >= 3) {
      throw new HttpError(400, '每人最多提交 3 个作品，请先删除后再提交')
    }

    const coverAsset = assertStoredAsset(context.env, body.coverImage ?? null, track === 'landing')
    const imageAssets = assertStoredAssets(context.env, body.images ?? [])
    const finalCover = coverAsset ?? imageAssets[0] ?? null
    const createdAt = nowIso()
    const workId = crypto.randomUUID()

    await context.env.DB.prepare(
      `
        INSERT INTO works (
          id,
          user_id,
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
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NULL, ?, ?)
      `,
    )
      .bind(
        workId,
        user.id,
        track,
        title,
        description,
        authorName,
        externalUrl || null,
        platformType,
        finalCover?.url ?? null,
        finalCover?.objectKey ?? null,
        createdAt,
        createdAt,
      )
      .run()

    for (const [index, asset] of imageAssets.entries()) {
      await context.env.DB.prepare(
        `
          INSERT INTO work_images (id, work_id, image_url, object_key, sort_order, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
      )
        .bind(crypto.randomUUID(), workId, asset.url, asset.objectKey, index, createdAt)
        .run()
    }

    return json({
      ok: true,
      workId,
      status: 'pending',
    })
  })
