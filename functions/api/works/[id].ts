import { getWorkById } from '../_works'
import { HttpError, assertMethod, json, parseJson, requireUser, withErrorHandling } from '../_utils'

interface UpdateWorkBody {
  title?: string
  description?: string
  authorName?: string
  externalUrl?: string | null
  platformType?: string
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

    if (work.status === 'approved') {
      throw new HttpError(400, '已通过审核的作品暂不支持直接编辑')
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

    await context.env.DB.prepare(
      `
        UPDATE works
        SET title = ?, description = ?, author_name = ?, external_url = ?, platform_type = ?, status = 'pending', reject_reason = NULL, updated_at = ?
        WHERE id = ?
      `,
    )
      .bind(title, description, authorName, externalUrl || null, platformType, new Date().toISOString(), work.id)
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
