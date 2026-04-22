import {
  HttpError,
  assertMethod,
  createObjectKey,
  detectImageExtension,
  getBucketHost,
  getPublicBaseUrl,
  isAllowedImageType,
  json,
  parseJson,
  requireUser,
  withErrorHandling,
} from '../_utils'

interface UploadPolicyBody {
  fileName?: string
  contentType?: string
}

async function hmacSha1(secret: string, payload: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  let binary = ''

  for (const byte of new Uint8Array(signature)) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary)
}

export const onRequestPost: PagesFunction = async (context) =>
  withErrorHandling(async () => {
    assertMethod(context.request, 'POST')
    const user = await requireUser(context)
    const body = await parseJson<UploadPolicyBody>(context.request)
    const fileName = (body.fileName ?? '').trim()
    const contentType = (body.contentType ?? '').trim()

    if (!fileName || !contentType) {
      throw new HttpError(400, '缺少文件信息')
    }

    if (!isAllowedImageType(contentType)) {
      throw new HttpError(400, '只支持 jpg/png/webp 图片')
    }

    const extension = detectImageExtension(fileName, contentType)

    if (!extension) {
      throw new HttpError(400, '图片格式不支持')
    }

    const key = createObjectKey(context.env, user.id, extension)
    const maxBytes = 20 * 1024 * 1024
    const expiration = new Date(Date.now() + 60_000).toISOString()
    const policyObject = {
      expiration,
      conditions: [
        ['eq', '$key', key],
        ['starts-with', '$Content-Type', 'image/'],
        ['content-length-range', 0, maxBytes],
        { success_action_status: '200' },
      ],
    }
    const policy = btoa(JSON.stringify(policyObject))
    const signature = await hmacSha1(context.env.ALIYUN_ACCESS_KEY_SECRET, policy)

    return json({
      host: getBucketHost(context.env),
      key,
      policy,
      signature,
      accessKeyId: context.env.ALIYUN_ACCESS_KEY_ID,
      successActionStatus: '200',
      publicUrl: `${getPublicBaseUrl(context.env)}/${key}`,
    })
  })
