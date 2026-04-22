import type { PlatformType, PublicWork, SessionUser, StoredAsset, Track, UploadPolicy } from '../types'

class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(input: string, init?: RequestInit) {
  let response: Response

  try {
    response = await fetch(input, {
      credentials: 'same-origin',
      headers: {
        'content-type': 'application/json',
        ...(init?.headers ?? {}),
      },
      ...init,
    })
  } catch {
    throw new ApiError(0, '网络请求失败：请确认本地后端已启动，或检查线上接口可用性')
  }

  const text = await response.text()
  const data = text ? (JSON.parse(text) as T & { error?: string }) : ({} as T & { error?: string })

  if (!response.ok) {
    throw new ApiError(response.status, data.error ?? '请求失败')
  }

  return data
}

export async function fetchMe() {
  return request<{ user: SessionUser | null }>('/api/me', {
    headers: {},
  })
}

export async function requestCode(email: string) {
  return request<{ ok: boolean; message: string }>('/api/auth/request-code', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export async function verifyCode(email: string, code: string) {
  return request<{ ok: boolean; user: SessionUser }>('/api/auth/verify-code', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  })
}

export async function logout() {
  return request<{ ok: boolean }>('/api/auth/logout', {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export async function fetchWorks(track: 'all' | Track) {
  return request<{
    works: Array<Omit<PublicWork, 'imageUrls' | 'source'>>
  }>(`/api/works?track=${track}`, {
    headers: {},
  })
}

export async function fetchWork(id: string) {
  return request<{ work: PublicWork }>(`/api/works/${id}`, {
    headers: {},
  })
}

export async function fetchMyWorks() {
  return request<{ works: PublicWork[] }>('/api/my/works', {
    headers: {},
  })
}

export async function fetchPendingWorks() {
  return request<{ works: PublicWork[] }>('/api/admin/works', {
    headers: {},
  })
}

export async function approveWork(id: string) {
  return request<{ ok: boolean }>(`/api/admin/works/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export async function rejectWork(id: string, reason: string) {
  return request<{ ok: boolean }>(`/api/admin/works/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

export async function createUploadPolicy(fileName: string, contentType: string) {
  return request<UploadPolicy>('/api/uploads/policy', {
    method: 'POST',
    body: JSON.stringify({ fileName, contentType }),
  })
}

export async function uploadImage(file: File): Promise<StoredAsset> {
  const policy = await createUploadPolicy(file.name, file.type)
  const formData = new FormData()

  formData.set('key', policy.key)
  formData.set('policy', policy.policy)
  formData.set('OSSAccessKeyId', policy.accessKeyId)
  formData.set('Signature', policy.signature)
  formData.set('success_action_status', policy.successActionStatus)
  formData.set('Content-Type', file.type)
  formData.set('file', file)

  let response: Response

  try {
    response = await fetch(policy.host, {
      method: 'POST',
      body: formData,
    })
  } catch {
    throw new ApiError(0, '图片上传失败：请检查 OSS CORS 配置是否放行当前站点域名')
  }

  if (!response.ok) {
    throw new ApiError(response.status, '图片上传失败')
  }

  return {
    url: policy.publicUrl,
    objectKey: policy.key,
  }
}

export async function createWork(payload: {
  track: Track
  title: string
  description: string
  authorName: string
  externalUrl: string | null
  platformType: PlatformType
  coverImage: StoredAsset | null
  images: StoredAsset[]
}) {
  return request<{ ok: boolean; workId: string; status: string }>('/api/works', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export { ApiError }
