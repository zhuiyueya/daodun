import { createLogoutCookie, json, withErrorHandling } from '../_utils'

export const onRequestPost: PagesFunction = async (context) =>
  withErrorHandling(async () => {
    const sessionId =
      context.request.headers
        .get('cookie')
        ?.split(';')
        .find((item) => item.trim().startsWith('session_id=')) ?? null

    if (sessionId) {
      const value = sessionId.split('=').slice(1).join('=').trim()

      await context.env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(value).run()
    }

    return json(
      { ok: true },
      {
        headers: {
          'Set-Cookie': createLogoutCookie(context.request),
        },
      },
    )
  })
