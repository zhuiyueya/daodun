import http from 'node:http'
import { createHash, randomUUID } from 'node:crypto'

const PORT = Number(process.env.PORT || 8789)
const APP_ID = requiredEnv('WECHAT_APP_ID')
const APP_SECRET = requiredEnv('WECHAT_APP_SECRET')
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean)

const cache = {
  accessToken: null,
  jsapiTicket: null,
}

const server = http.createServer(async (req, res) => {
  try {
    applyCors(req, res)

    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }

    if (req.url === '/healthz' && req.method === 'GET') {
      writeJson(res, 200, { ok: true })
      return
    }

    if (req.url === '/wechat/jssdk-sign' && req.method === 'POST') {
      const body = await readJson(req)
      const url = typeof body?.url === 'string' ? body.url.trim() : ''

      if (!url) {
        writeJson(res, 400, { error: '缺少签名 URL' })
        return
      }

      let parsedUrl

      try {
        parsedUrl = new URL(url)
      } catch {
        writeJson(res, 400, { error: '签名 URL 非法' })
        return
      }

      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        writeJson(res, 400, { error: '签名 URL 协议不支持' })
        return
      }

      const nonceStr = randomUUID().replace(/-/g, '')
      const timestamp = Math.floor(Date.now() / 1000)
      const jsapiTicket = await getJsapiTicket()
      const signature = sha1Hex(
        `jsapi_ticket=${jsapiTicket}&noncestr=${nonceStr}&timestamp=${timestamp}&url=${url}`,
      )

      writeJson(res, 200, {
        appId: APP_ID,
        timestamp,
        nonceStr,
        signature,
      })
      return
    }

    writeJson(res, 404, { error: 'Not Found' })
  } catch (error) {
    writeJson(res, 500, {
      error: error instanceof Error ? error.message : '服务器异常',
    })
  }
})

server.listen(PORT, () => {
  console.log(`wechat-sign-service listening on http://0.0.0.0:${PORT}`)
})

function requiredEnv(name) {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`Missing required env: ${name}`)
  }

  return value
}

function applyCors(req, res) {
  const origin = req.headers.origin

  if (!origin) {
    return
  }

  if (ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
  }
}

function writeJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
  })
  res.end(JSON.stringify(payload))
}

async function readJson(req) {
  const chunks = []

  for await (const chunk of req) {
    chunks.push(chunk)
  }

  const raw = Buffer.concat(chunks).toString('utf8')

  if (!raw) {
    return {}
  }

  return JSON.parse(raw)
}

async function getJsapiTicket() {
  const now = Date.now()

  if (cache.jsapiTicket && cache.jsapiTicket.expiresAt > now) {
    return cache.jsapiTicket.value
  }

  const accessToken = await getAccessToken()
  const response = await fetch(
    `https://api.weixin.qq.com/cgi-bin/ticket/getticket?type=jsapi&access_token=${encodeURIComponent(accessToken)}`,
  )
  const data = await response.json()

  if (!response.ok || data.errcode || !data.ticket || !data.expires_in) {
    throw new Error(`微信 jsapi_ticket 获取失败：${data.errmsg ?? '未知错误'}`)
  }

  cache.jsapiTicket = {
    value: data.ticket,
    expiresAt: now + Math.max(data.expires_in - 300, 60) * 1000,
  }

  return data.ticket
}

async function getAccessToken() {
  const now = Date.now()

  if (cache.accessToken && cache.accessToken.expiresAt > now) {
    return cache.accessToken.value
  }

  const response = await fetch(
    `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${encodeURIComponent(APP_ID)}&secret=${encodeURIComponent(APP_SECRET)}`,
  )
  const data = await response.json()

  if (!response.ok || data.errcode || !data.access_token || !data.expires_in) {
    throw new Error(`微信 access_token 获取失败：${data.errmsg ?? '未知错误'}`)
  }

  cache.accessToken = {
    value: data.access_token,
    expiresAt: now + Math.max(data.expires_in - 300, 60) * 1000,
  }

  return data.access_token
}

function sha1Hex(text) {
  return createHash('sha1').update(text).digest('hex')
}
