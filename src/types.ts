export type Track = 'landing' | 'idea'
export type WorkStatus = 'pending' | 'approved' | 'rejected'
export type PlatformType = 'none' | 'website' | 'douyin' | 'bilibili' | 'other'

export interface SessionUser {
  id: string
  email: string
  isAdmin: boolean
}

export interface PublicWork {
  id: string
  track: Track
  title: string
  description: string
  authorName: string
  externalUrl: string | null
  platformType: PlatformType
  coverImageUrl: string | null
  imageUrls: string[]
  createdAt: string
  status?: WorkStatus
  rejectReason?: string | null
  ownerEmail?: string
  source?: 'live' | 'sample'
}

export interface UploadPolicy {
  host: string
  key: string
  policy: string
  signature: string
  accessKeyId: string
  successActionStatus: string
  publicUrl: string
}

export interface StoredAsset {
  url: string
  objectKey: string
}
