import {
  HttpError,
  createSession,
  createSessionCookie,
  json,
  normalizeEmail,
  nowIso,
  parseJson,
  sha256,
  withErrorHandling,
} from '../_utils'

interface VerifyCodeBody {
  email?: string
  code?: string
}

export const onRequestPost: PagesFunction = async (context) =>
  withErrorHandling(async () => {
    const body = await parseJson<VerifyCodeBody>(context.request)
    const email = normalizeEmail(body.email ?? '')
    const code = (body.code ?? '').trim()

    if (!email || !code) {
      throw new HttpError(400, '请输入邮箱和验证码')
    }

    const codeHash = await sha256(code)
    const record = await context.env.DB.prepare(
      `
        SELECT id, code_hash, expires_at, used_at
        FROM email_codes
        WHERE email = ?
        ORDER BY created_at DESC
        LIMIT 1
      `,
    )
      .bind(email)
      .first<{ id: string; code_hash: string; expires_at: string; used_at: string | null }>()

    const expired = !record || Number.isNaN(Date.parse(record.expires_at)) || Date.parse(record.expires_at) <= Date.now()
    const used = !record || record.used_at !== null
    const hashMismatch = !record || record.code_hash !== codeHash

    if (expired || used || hashMismatch) {
      throw new HttpError(400, '验证码错误或已过期')
    }

    await context.env.DB.prepare('UPDATE email_codes SET used_at = ? WHERE id = ?')
      .bind(nowIso(), record.id)
      .run()

    let user = await context.env.DB.prepare('SELECT id FROM users WHERE email = ? LIMIT 1')
      .bind(email)
      .first<{ id: string }>()

    if (!user) {
      const userId = crypto.randomUUID()

      await context.env.DB.prepare(
        'INSERT INTO users (id, email, created_at, last_login_at) VALUES (?, ?, ?, ?)',
      )
        .bind(userId, email, nowIso(), nowIso())
        .run()

      user = { id: userId }
    } else {
      await context.env.DB.prepare('UPDATE users SET last_login_at = ? WHERE id = ?')
        .bind(nowIso(), user.id)
        .run()
    }

    const sessionId = await createSession(context, user.id)

    return json(
      {
        ok: true,
        user: {
          id: user.id,
          email,
          isAdmin:
            context.env.ADMIN_EMAILS
              ?.split(',')
              .map((item) => item.trim().toLowerCase())
              .filter(Boolean)
              .includes(email) ?? false,
        },
      },
      {
        headers: {
          'Set-Cookie': createSessionCookie(context.request, sessionId),
        },
      },
    )
  })
