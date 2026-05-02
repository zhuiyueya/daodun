import type { PublicWork } from '../types'

export interface WechatSharePayload {
  title: string
  desc?: string
  link: string
  imgUrl: string
}

export interface WechatShareData {
  friend: WechatSharePayload
  timeline: WechatSharePayload
}

export interface WechatJssdkSignature {
  appId: string
  timestamp: number
  nonceStr: string
  signature: string
}

export interface WechatSdk {
  config: (config: {
    debug?: boolean
    appId: string
    timestamp: number
    nonceStr: string
    signature: string
    jsApiList: string[]
  }) => void
  ready: (callback: () => void) => void
  error: (callback: (error: unknown) => void) => void
  updateAppMessageShareData: (
    data: WechatSharePayload & {
      success?: () => void
      fail?: (error: unknown) => void
    },
  ) => void
  updateTimelineShareData: (
    data: WechatSharePayload & {
      success?: () => void
      fail?: (error: unknown) => void
    },
  ) => void
  onMenuShareAppMessage?: (
    data: WechatSharePayload & {
      success?: () => void
      fail?: (error: unknown) => void
    },
  ) => void
  onMenuShareTimeline?: (
    data: WechatSharePayload & {
      success?: () => void
      fail?: (error: unknown) => void
    },
  ) => void
}

declare global {
  interface Window {
    wx?: WechatSdk
  }
}

const homeFriendImage = '/wechat-share-home-friend.png'
const homeTimelineImage = '/wechat-share-home-timeline.png'
const wechatSdkUrl = 'https://res.wx.qq.com/open/js/jweixin-1.6.0.js'

export function isWeChatBrowser(userAgent: string) {
  return /MicroMessenger/i.test(userAgent)
}

export function getWechatSignatureUrl(currentUrl: string) {
  return currentUrl.split('#')[0] ?? currentUrl
}

function absoluteAssetUrl(currentUrl: string, assetPath: string) {
  return new URL(assetPath, getWechatSignatureUrl(currentUrl)).toString()
}

export function buildWechatShareData(input: {
  currentUrl: string
  page: 'home' | 'detail' | 'default'
  work?: PublicWork | null
}): WechatShareData {
  if (input.page === 'detail' && input.work) {
    const title = input.work.title
    const desc = `快来看看我的作品：${input.work.title}`
    const imgUrl =
      input.work.coverImageUrl ??
      absoluteAssetUrl(input.currentUrl, homeFriendImage)

    return {
      friend: {
        title,
        desc,
        link: input.currentUrl,
        imgUrl,
      },
      timeline: {
        title,
        link: input.currentUrl,
        imgUrl,
      },
    }
  }

  const link = getWechatSignatureUrl(input.currentUrl)
  const title = 'ABSTRACT JAM 2026｜Vibe Coding 抽象创作大赛'
  const desc = '带着你的抽象想法或产品 Demo 来参赛，赢奖金、见投资人，让好想法被看见。'

  return {
    friend: {
      title,
      desc,
      link,
      imgUrl: absoluteAssetUrl(input.currentUrl, homeFriendImage),
    },
    timeline: {
      title,
      link,
      imgUrl: absoluteAssetUrl(input.currentUrl, homeTimelineImage),
    },
  }
}

let wechatSdkLoader: Promise<WechatSdk> | null = null

export function loadWechatSdk() {
  if (window.wx) {
    return Promise.resolve(window.wx)
  }

  if (wechatSdkLoader) {
    return wechatSdkLoader
  }

  wechatSdkLoader = new Promise<WechatSdk>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = wechatSdkUrl
    script.async = true
    script.onload = () => {
      if (window.wx) {
        resolve(window.wx)
        return
      }

      reject(new Error('微信 JSSDK 加载完成但 wx 对象不存在'))
    }
    script.onerror = () => reject(new Error('微信 JSSDK 脚本加载失败'))
    document.head.appendChild(script)
  })

  return wechatSdkLoader
}

export function applyWechatShareData(
  wx: WechatSdk,
  shareData: WechatShareData,
  hooks?: {
    onFriendSuccess?: () => void
    onFriendFail?: (error: unknown) => void
    onTimelineSuccess?: () => void
    onTimelineFail?: (error: unknown) => void
  },
) {
  const friendPayload = {
    ...shareData.friend,
    success: hooks?.onFriendSuccess,
    fail: hooks?.onFriendFail,
  }
  const timelinePayload = {
    ...shareData.timeline,
    success: hooks?.onTimelineSuccess,
    fail: hooks?.onTimelineFail,
  }

  wx.updateAppMessageShareData(friendPayload)
  wx.updateTimelineShareData(timelinePayload)
  wx.onMenuShareAppMessage?.(friendPayload)
  wx.onMenuShareTimeline?.(timelinePayload)
}
