import { describe, expect, it } from 'vitest'

import type { PublicWork } from '../types'
import {
  buildWechatShareData,
  getWechatSignatureUrl,
  isWeChatBrowser,
} from './wechat'

const sampleWork: PublicWork = {
  id: 'work-1',
  track: 'landing',
  title: '我的抽象作品',
  description: '这是一个抽象但可运行的作品',
  authorName: '刀盾选手',
  externalUrl: 'https://example.com',
  platformType: 'website',
  coverImageUrl: 'https://example.com/cover.png',
  imageUrls: [],
  createdAt: '2026-05-01T00:00:00+08:00',
}

describe('isWeChatBrowser', () => {
  it('detects WeChat browser from user agent', () => {
    expect(
      isWeChatBrowser(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 MicroMessenger/8.0.50',
      ),
    ).toBe(true)
  })

  it('returns false for non-WeChat user agent', () => {
    expect(
      isWeChatBrowser(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
      ),
    ).toBe(false)
  })
})

describe('getWechatSignatureUrl', () => {
  it('removes the hash fragment from the current url', () => {
    expect(getWechatSignatureUrl('https://wodedaodun.pages.dev/#/gallery')).toBe(
      'https://wodedaodun.pages.dev/',
    )
  })
})

describe('buildWechatShareData', () => {
  it('builds signup page share data with dedicated friend and timeline images', () => {
    const shareData = buildWechatShareData({
      currentUrl: 'https://wodedaodun.pages.dev/',
      page: 'home',
    })

    expect(shareData.friend.link).toBe('https://wodedaodun.pages.dev/')
    expect(shareData.friend.imgUrl).toContain('/wechat-share-home-friend')
    expect(shareData.timeline.imgUrl).toContain('/wechat-share-home-timeline')
  })

  it('builds work detail share data from the current work cover', () => {
    const shareData = buildWechatShareData({
      currentUrl: 'https://wodedaodun.pages.dev/#/work/work-1',
      page: 'detail',
      work: sampleWork,
    })

    expect(shareData.friend.title).toBe('我的抽象作品')
    expect(shareData.friend.desc).toContain('快来看看我的作品')
    expect(shareData.friend.imgUrl).toBe('https://example.com/cover.png')
    expect(shareData.timeline.link).toBe('https://wodedaodun.pages.dev/#/work/work-1')
  })
})
