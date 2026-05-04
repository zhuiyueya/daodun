import QRCode from 'qrcode'

interface WorkSharePosterInput {
  title: string
  description: string
  coverImageUrl: string | null
  shareUrl: string
}

interface WorkSharePosterResult {
  blob: Blob
  coverLoadError: string | null
}

const POSTER_WIDTH = 1080
const POSTER_HEIGHT = 1520

function truncateText(text: string, maxLength: number) {
  const compact = text.replace(/\s+/g, ' ').trim()

  if (compact.length <= maxLength) {
    return compact
  }

  return `${compact.slice(0, maxLength).trim()}...`
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
) {
  const lines: string[] = []
  let currentLine = ''

  for (const char of text) {
    const nextLine = `${currentLine}${char}`

    if (ctx.measureText(nextLine).width <= maxWidth) {
      currentLine = nextLine
      continue
    }

    if (currentLine) {
      lines.push(currentLine)
      currentLine = char
    } else {
      lines.push(char)
      currentLine = ''
    }

    if (lines.length === maxLines) {
      break
    }
  }

  if (lines.length < maxLines && currentLine) {
    lines.push(currentLine)
  }

  if (lines.length === maxLines && lines.join('').length < text.length) {
    const lastLine = lines[maxLines - 1] ?? ''
    const ellipsis = '...'
    let finalLine = lastLine

    while (finalLine && ctx.measureText(`${finalLine}${ellipsis}`).width > maxWidth) {
      finalLine = finalLine.slice(0, -1)
    }

    lines[maxLines - 1] = `${finalLine}${ellipsis}`
  }

  return lines
}

function createCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('当前浏览器不支持海报生成，请稍后再试')
  }

  return { canvas, ctx }
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const finalRadius = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + finalRadius, y)
  ctx.arcTo(x + width, y, x + width, y + height, finalRadius)
  ctx.arcTo(x + width, y + height, x, y + height, finalRadius)
  ctx.arcTo(x, y + height, x, y, finalRadius)
  ctx.arcTo(x, y, x + width, y, finalRadius)
  ctx.closePath()
}

async function loadImage(url: string) {
  const image = new Image()
  image.decoding = 'async'
  let objectUrl: string | null = null

  if (/^https?:\/\//.test(url)) {
    const proxiedUrl = new URL('/api/image-proxy', window.location.origin)
    proxiedUrl.searchParams.set('url', url)

    const response = await fetch(proxiedUrl.toString(), {
      mode: 'cors',
      credentials: 'same-origin',
    })

    if (!response.ok) {
      throw new Error(`图片请求失败: ${response.status}`)
    }

    const blob = await response.blob()
    objectUrl = URL.createObjectURL(blob)
  }

  await new Promise<void>((resolve, reject) => {
    image.onload = () => {
      resolve()
    }
    image.onerror = () => reject(new Error(`图片加载失败: ${url}`))
    image.src = objectUrl ?? url
  })

  return {
    image,
    cleanup: () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    },
  }
}

async function canvasToBlob(canvas: HTMLCanvasElement) {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((value) => resolve(value), 'image/png', 1)
  })

  if (!blob) {
    throw new Error('海报导出失败，请稍后再试')
  }

  return blob
}

export async function createWorkSharePoster({
  title,
  description,
  coverImageUrl,
  shareUrl,
}: WorkSharePosterInput) {
  const { canvas, ctx } = createCanvas(POSTER_WIDTH, POSTER_HEIGHT)
  const summary = truncateText(description, 88)
  const shareTitle = `快来看看我的作品《${title}》`

  const backgroundGradient = ctx.createLinearGradient(0, 0, POSTER_WIDTH, POSTER_HEIGHT)
  backgroundGradient.addColorStop(0, '#0a0b16')
  backgroundGradient.addColorStop(0.52, '#101226')
  backgroundGradient.addColorStop(1, '#1a1330')
  ctx.fillStyle = backgroundGradient
  ctx.fillRect(0, 0, POSTER_WIDTH, POSTER_HEIGHT)

  const orbA = ctx.createRadialGradient(180, 220, 20, 180, 220, 300)
  orbA.addColorStop(0, 'rgba(139, 92, 246, 0.28)')
  orbA.addColorStop(1, 'rgba(139, 92, 246, 0)')
  ctx.fillStyle = orbA
  ctx.fillRect(0, 0, POSTER_WIDTH, POSTER_HEIGHT)

  const orbB = ctx.createRadialGradient(900, 1280, 20, 900, 1280, 280)
  orbB.addColorStop(0, 'rgba(236, 72, 153, 0.24)')
  orbB.addColorStop(1, 'rgba(236, 72, 153, 0)')
  ctx.fillStyle = orbB
  ctx.fillRect(0, 0, POSTER_WIDTH, POSTER_HEIGHT)

  roundedRectPath(ctx, 54, 54, POSTER_WIDTH - 108, POSTER_HEIGHT - 108, 40)
  ctx.fillStyle = 'rgba(12, 13, 26, 0.88)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.fillStyle = '#8b5cf6'
  ctx.font = '700 28px "Noto Sans SC", "PingFang SC", sans-serif'
  ctx.fillText('ABSTRACT JAM 作品分享', 96, 130)

  ctx.fillStyle = '#ffffff'
  ctx.font = '700 58px "Noto Sans SC", "PingFang SC", sans-serif'
  const titleLines = wrapLines(ctx, shareTitle, 888, 3)
  titleLines.forEach((line, index) => {
    ctx.fillText(line, 96, 220 + index * 74)
  })

  const coverTop = 430
  const coverHeight = 560
  const coverWidth = POSTER_WIDTH - 192
  roundedRectPath(ctx, 96, coverTop, coverWidth, coverHeight, 28)
  ctx.save()
  ctx.clip()

  let coverLoadError: string | null = null

  if (coverImageUrl) {
    try {
      const { image, cleanup } = await loadImage(coverImageUrl)
      const scale = Math.max(coverWidth / image.width, coverHeight / image.height)
      const drawWidth = image.width * scale
      const drawHeight = image.height * scale
      const drawX = 96 + (coverWidth - drawWidth) / 2
      const drawY = coverTop + (coverHeight - drawHeight) / 2
      ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight)
      cleanup()
    } catch (error) {
      coverLoadError = error instanceof Error ? error.message : '封面图加载失败'
      const coverGradient = ctx.createLinearGradient(96, coverTop, 96 + coverWidth, coverTop + coverHeight)
      coverGradient.addColorStop(0, '#8b5cf6')
      coverGradient.addColorStop(1, '#ec4899')
      ctx.fillStyle = coverGradient
      ctx.fillRect(96, coverTop, coverWidth, coverHeight)
      ctx.fillStyle = 'rgba(255,255,255,0.9)'
      ctx.font = '700 48px "Noto Sans SC", "PingFang SC", sans-serif'
      const fallbackLines = wrapLines(ctx, title, coverWidth - 96, 3)
      fallbackLines.forEach((line, index) => {
        ctx.fillText(line, 144, coverTop + 180 + index * 62)
      })
    }
  } else {
    const coverGradient = ctx.createLinearGradient(96, coverTop, 96 + coverWidth, coverTop + coverHeight)
    coverGradient.addColorStop(0, '#181a31')
    coverGradient.addColorStop(1, '#24193a')
    ctx.fillStyle = coverGradient
    ctx.fillRect(96, coverTop, coverWidth, coverHeight)
    ctx.fillStyle = 'rgba(255,255,255,0.88)'
    ctx.font = '600 34px "Noto Sans SC", "PingFang SC", sans-serif'
    ctx.fillText('作品海报预览', 144, coverTop + 130)
    ctx.font = '700 46px "Noto Sans SC", "PingFang SC", sans-serif'
    const fallbackLines = wrapLines(ctx, title, coverWidth - 96, 3)
    fallbackLines.forEach((line, index) => {
      ctx.fillText(line, 144, coverTop + 240 + index * 58)
    })
  }

  ctx.restore()

  const qrDataUrl = await QRCode.toDataURL(shareUrl, {
    width: 256,
    margin: 1,
    color: {
      dark: '#111827',
      light: '#ffffff',
    },
  })
  const { image: qrImage, cleanup: cleanupQrImage } = await loadImage(qrDataUrl)

  roundedRectPath(ctx, 96, 1038, coverWidth, 326, 28)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)'
  ctx.stroke()

  ctx.fillStyle = '#f4f2ff'
  ctx.font = '700 34px "Noto Sans SC", "PingFang SC", sans-serif'
  ctx.fillText('作品简介', 136, 1100)

  ctx.fillStyle = 'rgba(232, 232, 240, 0.8)'
  ctx.font = '400 28px "Noto Sans SC", "PingFang SC", sans-serif'
  const summaryLines = wrapLines(ctx, summary || '这是一份值得打开看看的作品。', 520, 5)
  summaryLines.forEach((line, index) => {
    ctx.fillText(line, 136, 1164 + index * 44)
  })

  roundedRectPath(ctx, 736, 1086, 208, 208, 22)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  ctx.drawImage(qrImage, 760, 1110, 160, 160)

  ctx.fillStyle = 'rgba(255,255,255,0.86)'
  ctx.font = '600 24px "Noto Sans SC", "PingFang SC", sans-serif'
  ctx.fillText('扫码查看作品详情', 728, 1330)

  ctx.fillStyle = 'rgba(255,255,255,0.64)'
  ctx.font = '400 22px "Noto Sans SC", "PingFang SC", sans-serif'
  ctx.fillText('保存图片后即可转发到微信好友或朋友圈', 96, 1432)

  cleanupQrImage()

  return {
    blob: await canvasToBlob(canvas),
    coverLoadError,
  } satisfies WorkSharePosterResult
}
