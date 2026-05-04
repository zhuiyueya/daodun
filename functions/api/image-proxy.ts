import { HttpError, assertMethod, withErrorHandling } from './_utils'

const allowedHosts = new Set([
  'chasemoon.oss-cn-beijing.aliyuncs.com',
])

export const onRequestGet: PagesFunction = async (context) =>
  withErrorHandling(async () => {
    assertMethod(context.request, 'GET')
    const requestUrl = new URL(context.request.url)
    const target = requestUrl.searchParams.get('url')

    if (!target) {
      throw new HttpError(400, '缺少图片地址')
    }

    let targetUrl: URL

    try {
      targetUrl = new URL(target)
    } catch {
      throw new HttpError(400, '图片地址不合法')
    }

    if (!allowedHosts.has(targetUrl.host)) {
      throw new HttpError(403, '不允许代理该图片来源')
    }

    const upstream = await fetch(targetUrl.toString(), {
      method: 'GET',
      headers: {
        Accept: 'image/*',
      },
    })

    if (!upstream.ok) {
      throw new HttpError(upstream.status, `图片拉取失败: ${upstream.status}`)
    }

    const headers = new Headers()
    headers.set('Content-Type', upstream.headers.get('Content-Type') ?? 'application/octet-stream')
    headers.set('Cache-Control', 'public, max-age=600')

    const etag = upstream.headers.get('ETag')

    if (etag) {
      headers.set('ETag', etag)
    }

    return new Response(upstream.body, {
      status: 200,
      headers,
    })
  })
