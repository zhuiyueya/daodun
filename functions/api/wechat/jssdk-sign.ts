import {
  HttpError,
  assertMethod,
  json,
  parseJson,
  withErrorHandling,
} from '../_utils'

interface SignBody {
  url?: string
}

interface WechatAccessTokenResponse {
  access_token?: string
  expires_in?: number
  errcode?: number
  errmsg?: string
}

interface WechatTicketResponse {
  ticket?: string
  expires_in?: number
  errcode?: number
  errmsg?: string
}

declare global {
  // eslint-disable-next-line no-var
  var __wechatJssdkCache:
    | {
        accessToken?: { value: string; expiresAt: number }
        jsapiTicket?: { value: string; expiresAt: number }
      }
    | undefined
}

export const onRequestPost: PagesFunction = async (context) =>
  withErrorHandling(async () => {
    assertMethod(context.request, 'POST')
    const { url = '' } = await parseJson<SignBody>(context.request)
    const trimmedUrl = url.trim()

    if (!trimmedUrl) {
      throw new HttpError(400, '缺少签名 URL')
    }

    let parsedUrl: URL

    try {
      parsedUrl = new URL(trimmedUrl)
    } catch {
      throw new HttpError(400, '签名 URL 非法')
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new HttpError(400, '签名 URL 协议不支持')
    }

    const externalSignServiceUrl = context.env.WECHAT_SIGN_SERVICE_URL?.trim()

    if (externalSignServiceUrl) {
      return proxyToExternalSignService(externalSignServiceUrl, trimmedUrl)
    }

    const nonceStr = crypto.randomUUID().replace(/-/g, '')
    const timestamp = Math.floor(Date.now() / 1000)
    const jsapiTicket = await getJsapiTicket(context.env.WECHAT_APP_ID, context.env.WECHAT_APP_SECRET)
    const signature = await sha1Hex(
      `jsapi_ticket=${jsapiTicket}&noncestr=${nonceStr}&timestamp=${timestamp}&url=${trimmedUrl}`,
    )

    return json({
      appId: context.env.WECHAT_APP_ID,
      timestamp,
      nonceStr,
      signature,
    })
  })

async function proxyToExternalSignService(endpoint: string, url: string) {
  let response: Response

  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({ url }),
    })
  } catch {
    throw new HttpError(502, '外部微信签名服务不可用')
  }

  const text = await response.text()
  const contentType = response.headers.get('content-type') ?? 'unknown'
  let data: {
    appId?: string
    timestamp?: number
    nonceStr?: string
    signature?: string
    error?: string
  }

  try {
    data = text ? (JSON.parse(text) as typeof data) : {}
  } catch {
    const snippet = text.replace(/\s+/g, ' ').slice(0, 180)
    throw new HttpError(
      502,
      `外部微信签名服务返回了非法响应（status=${response.status}, content-type=${contentType}, body=${snippet || 'empty'}）`,
    )
  }

  if (!response.ok) {
    throw new HttpError(response.status, data.error ?? '外部微信签名服务请求失败')
  }

  if (!data.appId || !data.timestamp || !data.nonceStr || !data.signature) {
    throw new HttpError(502, '外部微信签名服务返回数据不完整')
  }

  return json({
    appId: data.appId,
    timestamp: data.timestamp,
    nonceStr: data.nonceStr,
    signature: data.signature,
  })
}

async function getJsapiTicket(appId: string, appSecret: string) {
  const cache = (globalThis.__wechatJssdkCache ??= {})
  const now = Date.now()

  if (cache.jsapiTicket && cache.jsapiTicket.expiresAt > now) {
    return cache.jsapiTicket.value
  }

  const accessToken = await getAccessToken(appId, appSecret)
  const response = await fetch(
    `https://api.weixin.qq.com/cgi-bin/ticket/getticket?type=jsapi&access_token=${encodeURIComponent(accessToken)}`,
  )
  const data = (await response.json()) as WechatTicketResponse

  if (!response.ok || data.errcode || !data.ticket || !data.expires_in) {
    throw new HttpError(502, `微信 jsapi_ticket 获取失败：${data.errmsg ?? '未知错误'}`)
  }

  cache.jsapiTicket = {
    value: data.ticket,
    expiresAt: now + Math.max(data.expires_in - 300, 60) * 1000,
  }

  return data.ticket
}

async function getAccessToken(appId: string, appSecret: string) {
  const cache = (globalThis.__wechatJssdkCache ??= {})
  const now = Date.now()

  if (cache.accessToken && cache.accessToken.expiresAt > now) {
    return cache.accessToken.value
  }

  const response = await fetch(
    `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${encodeURIComponent(appId)}&secret=${encodeURIComponent(appSecret)}`,
  )
  const data = (await response.json()) as WechatAccessTokenResponse

  if (!response.ok || data.errcode || !data.access_token || !data.expires_in) {
    throw new HttpError(502, `微信 access_token 获取失败：${data.errmsg ?? '未知错误'}`)
  }

  cache.accessToken = {
    value: data.access_token,
    expiresAt: now + Math.max(data.expires_in - 300, 60) * 1000,
  }

  return data.access_token
}

async function sha1Hex(text: string) {
  const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(text))

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}
