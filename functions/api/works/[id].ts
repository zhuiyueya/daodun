import { getWorkById } from '../_works'
import {
  HttpError,
  assertMethod,
  assertStoredAsset,
  assertStoredAssets,
  buildUploadPrefix,
  getPublicBaseUrl,
  json,
  parseJson,
  requireUser,
  withErrorHandling,
} from '../_utils'

interface UpdateWorkBody {
  title?: string
  description?: string
  authorName?: string
  externalUrl?: string | null
  platformType?: string
  coverImage?: {
    url?: string
    objectKey?: string
  } | null
  images?: Array<{
    url?: string
    objectKey?: string
  }>
}

const allowedPlatformTypes = ['none', 'website', 'douyin', 'bilibili', 'offline_app', 'other']

export const onRequestGet: PagesFunction = async (context) =>
  withErrorHandling(async () => {
    const work = await getWorkById(context, context.params.id)

    if (!work) {
      throw new HttpError(404, '作品不存在')
    }

    const user = await requireOptionalUser(context)

    if (
      work.status !== 'approved' &&
      (!user || (user.id !== work.userId && !user.isAdmin))
    ) {
      throw new HttpError(404, '作品不存在')
    }

    return json({
      work: {
        id: work.id,
        track: work.track,
        title: work.title,
        description: work.description,
        authorName: work.authorName,
        externalUrl: work.externalUrl,
        platformType: work.platformType,
        coverImageUrl: work.coverImageUrl,
        imageUrls: work.imageUrls,
        status: work.status,
        rejectReason: work.rejectReason,
        createdAt: work.createdAt,
      },
    })
  })

export const onRequestPut: PagesFunction = async (context) =>
  withErrorHandling(async () => {
    assertMethod(context.request, 'PUT')
    const user = await requireUser(context)
    const work = await getWorkById(context, context.params.id)

    if (!work) {
      throw new HttpError(404, '作品不存在')
    }

    if (work.userId !== user.id) {
      throw new HttpError(403, '不能修改别人的作品')
    }

    const body = await parseJson<UpdateWorkBody>(context.request)
    const title = (body.title ?? work.title).trim()
    const description = (body.description ?? work.description).trim()
    const authorName = (body.authorName ?? work.authorName).trim()
    const externalUrl = (body.externalUrl ?? work.externalUrl ?? '').trim()
    const platformType = body.platformType ?? work.platformType

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

    const coverAsset = normalizeStoredAsset(context.env, body.coverImage, {
      fallbackUrl: work.coverImageUrl,
      fallbackObjectKey: work.coverObjectKey,
      required: false,
    })

    const imageAssets = normalizeStoredAssets(context.env, body.images, work.imageUrls, work.imageObjectKeys)
    const finalCover = coverAsset ?? imageAssets[0] ?? null

    if (work.track === 'landing' && !externalUrl) {
      throw new HttpError(400, '落地作品请填写作品链接')
    }

    if (work.track === 'landing' && !finalCover) {
      throw new HttpError(400, '落地作品请上传封面图')
    }

    const totalImages = (finalCover ? 1 : 0) + imageAssets.length

    if (totalImages > 9) {
      throw new HttpError(400, '图片总数最多 9 张')
    }

    await context.env.DB.prepare(
      `
        UPDATE works
        SET title = ?, description = ?, author_name = ?, external_url = ?, platform_type = ?, cover_image_url = ?, cover_object_key = ?, status = 'pending', reject_reason = NULL, updated_at = ?
        WHERE id = ?
      `,
    )
      .bind(
        title,
        description,
        authorName,
        externalUrl || null,
        platformType,
        finalCover?.url ?? null,
        finalCover?.objectKey ?? null,
        new Date().toISOString(),
        work.id,
      )
      .run()

    await context.env.DB.prepare('DELETE FROM work_images WHERE work_id = ?')
      .bind(work.id)
      .run()

    for (const [index, asset] of imageAssets.entries()) {
      await context.env.DB.prepare(
        `
          INSERT INTO work_images (id, work_id, image_url, object_key, sort_order, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
      )
        .bind(crypto.randomUUID(), work.id, asset.url, asset.objectKey, index, new Date().toISOString())
        .run()
    }

    return json({ ok: true })
  })

export const onRequestDelete: PagesFunction = async (context) =>
  withErrorHandling(async () => {
    assertMethod(context.request, 'DELETE')
    const user = await requireUser(context)
    const work = await getWorkById(context, context.params.id)

    if (!work) {
      throw new HttpError(404, '作品不存在')
    }

    if (work.userId !== user.id) {
      throw new HttpError(403, '不能删除别人的作品')
    }

    await context.env.DB.prepare('DELETE FROM work_images WHERE work_id = ?')
      .bind(work.id)
      .run()

    await context.env.DB.prepare('DELETE FROM works WHERE id = ?')
      .bind(work.id)
      .run()

    return json({ ok: true })
  })

async function requireOptionalUser(context: Parameters<typeof requireUser>[0]) {
  try {
    return await requireUser(context)
  } catch {
    return null
  }
}

function normalizeStoredAsset(
  env: Parameters<typeof assertStoredAsset>[0],
  incoming:
    | {
        url?: string
        objectKey?: string
      }
    | null
    | undefined,
  options: {
    fallbackUrl: string | null
    fallbackObjectKey: string | null
    required: boolean
  },
) {
  if (incoming === undefined) {
    if (!options.fallbackUrl || !options.fallbackObjectKey) {
      return assertStoredAsset(env, null, options.required)
    }

    return assertStoredAsset(
      env,
      {
        url: options.fallbackUrl,
        objectKey: options.fallbackObjectKey,
      },
      options.required,
    )
  }

  if (incoming === null) {
    return assertStoredAsset(env, null, options.required)
  }

  const url = (incoming.url ?? '').trim()
  const objectKey = resolveObjectKey(env, url, incoming.objectKey)

  return assertStoredAsset(
    env,
    {
      url,
      objectKey,
    },
    options.required,
  )
}

function normalizeStoredAssets(
  env: Parameters<typeof assertStoredAsset>[0],
  incoming: Array<{ url?: string; objectKey?: string }> | undefined,
  fallbackUrls: string[],
  fallbackObjectKeys: string[],
) {
  if (incoming === undefined) {
    return assertStoredAssets(
      env,
      fallbackUrls.map((url, index) => ({
        url,
        objectKey: fallbackObjectKeys[index] ?? resolveObjectKey(env, url),
      })),
    )
  }

  return assertStoredAssets(
    env,
    incoming.map((item) => {
      const url = (item.url ?? '').trim()
      return {
        url,
        objectKey: resolveObjectKey(env, url, item.objectKey),
      }
    }),
  )
}

function resolveObjectKey(
  env: Parameters<typeof assertStoredAsset>[0],
  url: string,
  objectKey?: string,
) {
  const rawObjectKey = objectKey?.trim()

  if (rawObjectKey) {
    return rawObjectKey
  }

  const base = `${getPublicBaseUrl(env)}/`

  if (!url.startsWith(base)) {
    throw new HttpError(400, '图片信息非法')
  }

  const derived = url.slice(base.length)
  const prefix = buildUploadPrefix(env)

  if (!derived.startsWith(prefix)) {
    throw new HttpError(400, '图片信息非法')
  }

  return derived
}
