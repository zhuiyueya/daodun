import { getCurrentUser, json, withErrorHandling } from './_utils'

export const onRequestGet: PagesFunction = async (context) =>
  withErrorHandling(async () => {
    const user = await getCurrentUser(context)

    return json({ user })
  })
