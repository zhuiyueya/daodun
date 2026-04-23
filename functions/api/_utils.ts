export interface Env {
  DB: D1Database
  ALIYUN_ACCESS_KEY_ID: string
  ALIYUN_ACCESS_KEY_SECRET: string
  OSS_BUCKET: string
  OSS_REGION: string
  OSS_ENDPOINT?: string
  OSS_PUBLIC_BASE_URL: string
  OSS_UPLOAD_PREFIX?: string
  SMTP_USER: string
  SMTP_PASS: string
  SMTP_HOST?: string
  SMTP_PORT?: string
  ADMIN_EMAILS?: string
}

export interface AppContext {
  request: Request
  env: Env
  params: Record<string, string>
}

export interface SessionUser {
  id: string
  email: string
  isAdmin: boolean
}

export interface StoredAsset {
  url: string
  objectKey: string
}

const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
}

export function json(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      ...jsonHeaders,
      ...(init?.headers ?? {}),
    },
  })
}

export function errorResponse(status: number, message: string) {
  return json({ error: message }, { status })
}

export async function parseJson<T>(request: Request) {
  try {
    return (await request.json()) as T
  } catch {
    throw new Error('请求体不是合法 JSON')
  }
}

export function getCookie(request: Request, name: string) {
  const cookieHeader = request.headers.get('cookie') ?? ''
  const pairs = cookieHeader.split(';').map((part) => part.trim())

  for (const pair of pairs) {
    if (!pair) {
      continue
    }

    const [key, ...rest] = pair.split('=')

    if (key === name) {
      return decodeURIComponent(rest.join('='))
    }
  }

  return null
}

function shouldUseSecureCookie(request: Request) {
  return new URL(request.url).protocol === 'https:'
}

export function createSessionCookie(request: Request, sessionId: string) {
  const secure = shouldUseSecureCookie(request) ? 'Secure; ' : ''

  return `session_id=${encodeURIComponent(sessionId)}; Path=/; HttpOnly; SameSite=Lax; ${secure}Max-Age=${60 * 60 * 24 * 7}`
}

export function createLogoutCookie(request: Request) {
  const secure = shouldUseSecureCookie(request) ? 'Secure; ' : ''

  return `session_id=; Path=/; HttpOnly; SameSite=Lax; ${secure}Max-Age=0`
}

export async function sha256(text: string) {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))

  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export function nowIso() {
  return new Date().toISOString()
}

export function plusMinutes(minutes: number) {
  return new Date(Date.now() + minutes * 60_000).toISOString()
}

export function plusDays(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60_000).toISOString()
}

export function randomDigits(length: number) {
  let result = ''

  while (result.length < length) {
    result += Math.floor(Math.random() * 10).toString()
  }

  return result.slice(0, length)
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function getClientIp(request: Request) {
  return (
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  )
}

export async function getCurrentUser(context: AppContext): Promise<SessionUser | null> {
  const sessionId = getCookie(context.request, 'session_id')

  if (!sessionId) {
    return null
  }

  const session = await context.env.DB.prepare(
    `
      SELECT users.id, users.email
      FROM sessions
      INNER JOIN users ON users.id = sessions.user_id
      WHERE sessions.id = ? AND sessions.expires_at > ?
      LIMIT 1
    `,
  )
    .bind(sessionId, nowIso())
    .first<{ id: string; email: string }>()

  if (!session) {
    return null
  }

  return {
    ...session,
    isAdmin: isAdminEmail(context.env.ADMIN_EMAILS, session.email),
  }
}

export async function requireUser(context: AppContext) {
  const user = await getCurrentUser(context)

  if (!user) {
    throw new HttpError(401, '请先登录')
  }

  return user
}

export async function requireAdmin(context: AppContext) {
  const user = await requireUser(context)

  if (!user.isAdmin) {
    throw new HttpError(403, '没有管理员权限')
  }

  return user
}

function isAdminEmail(rawAdminEmails: string | undefined, email: string) {
  if (!rawAdminEmails) {
    return false
  }

  const adminEmails = rawAdminEmails
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)

  return adminEmails.includes(email.toLowerCase())
}

export async function createSession(context: AppContext, userId: string) {
  const sessionId = crypto.randomUUID()

  await context.env.DB.prepare(
    'INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)',
  )
    .bind(sessionId, userId, plusDays(7), nowIso())
    .run()

  return sessionId
}

export function assertMethod(request: Request, allowedMethod: string) {
  if (request.method !== allowedMethod) {
    throw new HttpError(405, '请求方法不支持')
  }
}

export function buildUploadPrefix(env: Env) {
  const raw = env.OSS_UPLOAD_PREFIX?.trim() || 'daodun-cup/works/'

  return raw.endsWith('/') ? raw : `${raw}/`
}

function requireEnvString(name: string, value: string | undefined) {
  const trimmed = value?.trim()

  if (!trimmed) {
    throw new Error(`服务端环境变量缺失：${name}`)
  }

  return trimmed
}

export function normalizeRegion(rawRegion: string | undefined) {
  const safeRegion = requireEnvString('OSS_REGION', rawRegion)

  return safeRegion.replace(/^https?:\/\//, '').replace(/\.aliyuncs\.com$/, '')
}

export function getBucketHost(env: Env) {
  const bucket = requireEnvString('OSS_BUCKET', env.OSS_BUCKET)
  const region = normalizeRegion(env.OSS_REGION)

  return `https://${bucket}.${region}.aliyuncs.com`
}

export function getPublicBaseUrl(env: Env) {
  const url = requireEnvString('OSS_PUBLIC_BASE_URL', env.OSS_PUBLIC_BASE_URL)

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url.replace(/\/$/, '')
  }

  return `https://${url.replace(/\/$/, '')}`
}

export function createObjectKey(env: Env, userId: string, extension: string) {
  return `${buildUploadPrefix(env)}${userId}/${Date.now()}-${crypto.randomUUID()}.${extension}`
}

export function detectImageExtension(fileName: string, contentType: string) {
  const lowerName = fileName.toLowerCase()

  if (contentType === 'image/jpeg' || lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) {
    return 'jpg'
  }

  if (contentType === 'image/png' || lowerName.endsWith('.png')) {
    return 'png'
  }

  if (contentType === 'image/webp' || lowerName.endsWith('.webp')) {
    return 'webp'
  }

  return null
}

export function isAllowedImageType(contentType: string) {
  return ['image/jpeg', 'image/png', 'image/webp'].includes(contentType)
}

export function assertStoredAsset(env: Env, asset: StoredAsset | null | undefined, required: boolean) {
  if (!asset) {
    if (required) {
      throw new HttpError(400, '请先上传封面图')
    }

    return null
  }

  const baseUrl = `${getPublicBaseUrl(env)}/`
  const prefix = buildUploadPrefix(env)

  if (!asset.url.startsWith(baseUrl) || !asset.objectKey.startsWith(prefix)) {
    throw new HttpError(400, '图片信息非法')
  }

  return asset
}

export function assertStoredAssets(env: Env, assets: StoredAsset[]) {
  if (assets.length > 8) {
    throw new HttpError(400, '补充图片最多 8 张')
  }

  return assets.map((asset) => {
    const checked = assertStoredAsset(env, asset, true)

    if (!checked) {
      throw new HttpError(400, '图片信息非法')
    }

    return checked
  })
}

export class HttpError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function withErrorHandling(handler: () => Promise<Response>) {
  try {
    return await handler()
  } catch (error) {
    if (error instanceof HttpError) {
      return errorResponse(error.status, error.message)
    }

    if (error instanceof Error) {
      return errorResponse(500, error.message)
    }

    return errorResponse(500, '服务器开小差了')
  }
}
