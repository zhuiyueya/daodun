import { sendMailWithQqSmtp } from '../_smtp'
import {
  HttpError,
  assertMethod,
  getClientIp,
  isValidEmail,
  json,
  normalizeEmail,
  nowIso,
  parseJson,
  plusMinutes,
  randomDigits,
  sha256,
  withErrorHandling,
} from '../_utils'

interface RequestCodeBody {
  email?: string
}

export const onRequestPost: PagesFunction = async (context) =>
  withErrorHandling(async () => {
    assertMethod(context.request, 'POST')

    const body = await parseJson<RequestCodeBody>(context.request)
    const email = normalizeEmail(body.email ?? '')

    if (!isValidEmail(email)) {
      throw new HttpError(400, '邮箱格式不正确')
    }

    const ip = getClientIp(context.request)
    const recentCode = await context.env.DB.prepare(
      `
        SELECT id
        FROM email_codes
        WHERE email = ? AND created_at > ?
        LIMIT 1
      `,
    )
      .bind(email, new Date(Date.now() - 60_000).toISOString())
      .first()

    if (recentCode) {
      throw new HttpError(429, '验证码发送太频繁，请稍后再试')
    }

    const ipRequests = await context.env.DB.prepare(
      `
        SELECT COUNT(*) AS count
        FROM email_codes
        WHERE request_ip = ? AND created_at > ?
      `,
    )
      .bind(ip, new Date(Date.now() - 60 * 60_000).toISOString())
      .first<{ count: number }>()

    if ((ipRequests?.count ?? 0) >= 20) {
      throw new HttpError(429, '当前网络请求过多，请稍后再试')
    }

    const code = randomDigits(6)
    const codeHash = await sha256(code)

    await context.env.DB.prepare('DELETE FROM email_codes WHERE email = ? AND used_at IS NULL')
      .bind(email)
      .run()

    await context.env.DB.prepare(
      `
        INSERT INTO email_codes (id, email, code_hash, expires_at, created_at, request_ip)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
    )
      .bind(crypto.randomUUID(), email, codeHash, plusMinutes(10), nowIso(), ip)
      .run()

    await sendMailWithQqSmtp({
      user: context.env.SMTP_USER,
      pass: context.env.SMTP_PASS,
      to: email,
      subject: '刀盾杯登录验证码',
      text: `你的刀盾杯登录验证码是：${code}\n\n有效期十分钟，请勿转发给他人。`,
    })

    return json({ ok: true, message: '验证码已发送' })
  })
