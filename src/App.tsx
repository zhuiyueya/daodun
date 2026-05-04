import { useEffect, useEffectEvent, useRef, useState } from 'react'

import './App.css'
import landingPageHtml from '../index 2.html?raw'
import {
  ApiError,
  approveWork,
  createWork,
  deleteWork,
  fetchMe,
  fetchPendingWorks,
  fetchWork,
  fetchWorks,
  fetchWechatJssdkSignature,
  fetchMyWorks,
  logout,
  rejectWork,
  requestCode,
  updateWork,
  uploadImage,
  verifyCode,
} from './lib/api'
import {
  applyWechatShareData,
  buildWechatShareData,
  getWechatSignatureUrl,
  isWeChatBrowser,
  loadWechatSdk,
} from './lib/wechat'
import { createWorkSharePoster } from './lib/sharePoster'
import type { PlatformType, PublicWork, SessionUser, Track } from './types'
const TITLE_MAX = 30
const DESCRIPTION_MAX = 1200
const AUTHOR_MAX = 15

const galleryFilters = [
  { key: 'all', label: '全部' },
  { key: 'landing', label: '落地作品' },
  { key: 'idea', label: '纯想法' },
] as const

type GalleryFilter = (typeof galleryFilters)[number]['key']

type CurrentPage =
  | { page: 'home' }
  | { page: 'gallery' }
  | { page: 'detail'; workId: string }
  | { page: 'edit'; workId: string }
  | { page: 'auth'; next: string }
  | { page: 'submit' }
  | { page: 'my' }
  | { page: 'admin' }

function getCurrentPage(): CurrentPage {
  const hash = window.location.hash || '#/'
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  const [path, queryString = ''] = raw.split('?')
  const query = new URLSearchParams(queryString)

  if (path.startsWith('/work/')) {
    return {
      page: 'detail',
      workId: path.replace('/work/', ''),
    }
  }

  if (path.startsWith('/edit/')) {
    return {
      page: 'edit',
      workId: path.replace('/edit/', ''),
    }
  }

  if (path === '/gallery') {
    return { page: 'gallery' }
  }

  if (path === '/auth') {
    return { page: 'auth', next: query.get('next') ?? '/gallery' }
  }

  if (path === '/submit') {
    return { page: 'submit' }
  }

  if (path === '/my') {
    return { page: 'my' }
  }

  if (path === '/admin') {
    return { page: 'admin' }
  }

  return { page: 'home' }
}

function getGalleryDescription(text: string, maxLength = 56) {
  if (text.length <= maxLength) {
    return text
  }

  return `${text.slice(0, maxLength).trim()}...`
}

function getExternalHref(text: string | null) {
  if (!text) {
    return null
  }

  const matchedUrl = text.match(/https?:\/\/\S+/)

  return matchedUrl?.[0] ?? text
}

function goTo(path: string) {
  window.location.hash = `#${path.startsWith('/') ? path : `/${path}`}`
}

const landingGalleryUrl = `${window.location.origin}${window.location.pathname}#/gallery`

const homeLandingPageHtml = landingPageHtml
  .replace(
    '<a href="#" class="navbar__logo"><span class="navbar__logo-icon">Λ</span>ABSTRACT JAM</a>\n            <a href="https://wcnahf1otvjt.feishu.cn/share/base/form/shrcntGTeoraX4xm3Tb4OwKmiLd" class="navbar__cta clickable" target="_blank" rel="noopener noreferrer">立即报名</a>',
    `<a href="#" class="navbar__logo"><span class="navbar__logo-icon">Λ</span>ABSTRACT JAM</a>
            <div class="navbar__actions">
                <a href="${landingGalleryUrl}" class="navbar__cta clickable" target="_parent" rel="noopener noreferrer">作品广场</a>
                <a href="https://wcnahf1otvjt.feishu.cn/share/base/form/shrcntGTeoraX4xm3Tb4OwKmiLd" class="navbar__cta clickable" target="_blank" rel="noopener noreferrer">立即报名</a>
            </div>`,
  )
  .replace(
    '.navbar__cta:hover {',
    `.navbar__actions {
            display: inline-flex;
            align-items: center;
            gap: 12px;
        }

        .navbar__cta:hover {`,
  )

function HomePage() {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const container = containerRef.current

    if (!container) {
      return
    }

    const parser = new DOMParser()
    const documentTree = parser.parseFromString(homeLandingPageHtml, 'text/html')
    const managedHeadNodes: HTMLElement[] = []

    for (const child of Array.from(documentTree.head.children)) {
      if (child.tagName === 'TITLE' || child.tagName === 'META') {
        continue
      }

      const clonedNode = child.cloneNode(true) as HTMLElement
      clonedNode.setAttribute('data-landing-page-head', 'true')
      document.head.appendChild(clonedNode)
      managedHeadNodes.push(clonedNode)
    }

    container.innerHTML = documentTree.body.innerHTML

    const cleanupTasks: Array<() => void> = []

    if (typeof IntersectionObserver === 'undefined') {
      container.querySelectorAll('.reveal').forEach((element) => element.classList.add('visible'))
    } else {
      const revealObserver = new IntersectionObserver(
        (entries) => entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add('visible')),
        { threshold: 0.12 },
      )

      cleanupTasks.push(() => revealObserver.disconnect())
      container.querySelectorAll('.reveal').forEach((element) => revealObserver.observe(element))
    }

    const navbar = container.querySelector<HTMLElement>('#navbar')

    if (navbar) {
      const syncNavbarState = () => {
        navbar.classList.toggle('scrolled', window.scrollY > 60)
      }

      syncNavbarState()
      window.addEventListener('scroll', syncNavbarState, { passive: true })
      cleanupTasks.push(() => window.removeEventListener('scroll', syncNavbarState))
    }

    const faqItems = Array.from(container.querySelectorAll<HTMLElement>('.faq-item'))
    const faqCleanup = faqItems.map((item) => {
      const question = item.querySelector<HTMLElement>('.faq-item__question')

      if (!question) {
        return () => {}
      }

      const handleClick = () => {
        const open = item.classList.contains('open')
        faqItems.forEach((faqItem) => faqItem.classList.remove('open'))

        if (!open) {
          item.classList.add('open')
        }
      }

      question.addEventListener('click', handleClick)

      return () => question.removeEventListener('click', handleClick)
    })

    cleanupTasks.push(...faqCleanup)

    const signupUrl =
      'https://wcnahf1otvjt.feishu.cn/share/base/form/shrcntGTeoraX4xm3Tb4OwKmiLd'
    const ctaButton = container.querySelector<HTMLAnchorElement>('#ctaButton')

    if (ctaButton) {
      const handleSignupClick = (event: MouseEvent) => {
        event.preventDefault()
        window.open(signupUrl, '_blank', 'noopener,noreferrer')
      }

      ctaButton.addEventListener('click', handleSignupClick)
      cleanupTasks.push(() => ctaButton.removeEventListener('click', handleSignupClick))
    }

    const modalOverlay = container.querySelector<HTMLElement>('#modalOverlay')
    const modalClose = container.querySelector<HTMLElement>('#modalClose')
    const modalForm = container.querySelector<HTMLFormElement>('#modalForm')
    const modalSuccess = container.querySelector<HTMLElement>('#modalSuccess')
    const modalTitle = container.querySelector<HTMLElement>('#modalTitle')
    let closeModalTimeoutId: number | null = null

    const closeModal = () => {
      if (!modalOverlay || !modalForm || !modalSuccess || !modalTitle) {
        return
      }

      modalOverlay.classList.remove('active')
      document.body.style.overflow = ''

      closeModalTimeoutId = window.setTimeout(() => {
        modalForm.reset()
        modalForm.style.display = 'flex'
        modalSuccess.classList.remove('show')
        modalTitle.textContent = '报名参赛'
      }, 400)
    }

    if (modalClose) {
      modalClose.addEventListener('click', closeModal)
      cleanupTasks.push(() => modalClose.removeEventListener('click', closeModal))
    }

    if (modalOverlay) {
      const handleOverlayClick = (event: MouseEvent) => {
        if (event.target === modalOverlay) {
          closeModal()
        }
      }

      modalOverlay.addEventListener('click', handleOverlayClick)
      cleanupTasks.push(() => modalOverlay.removeEventListener('click', handleOverlayClick))
    }

    if (modalForm && modalSuccess && modalTitle) {
      const handleSubmit = (event: SubmitEvent) => {
        event.preventDefault()
        modalForm.style.display = 'none'
        modalSuccess.classList.add('show')
        modalTitle.textContent = '🎉 报名成功'
        closeModalTimeoutId = window.setTimeout(closeModal, 3500)
      }

      modalForm.addEventListener('submit', handleSubmit)
      cleanupTasks.push(() => modalForm.removeEventListener('submit', handleSubmit))
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && modalOverlay?.classList.contains('active')) {
        closeModal()
      }
    }

    document.addEventListener('keydown', handleEscape)
    cleanupTasks.push(() => document.removeEventListener('keydown', handleEscape))

    const anchorCleanups = Array.from(container.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')).map((anchor) => {
      const handleAnchorClick = (event: MouseEvent) => {
        const href = anchor.getAttribute('href')

        if (href === '#') {
          event.preventDefault()
          window.scrollTo({ top: 0, behavior: 'smooth' })
          return
        }

        if (!href) {
          return
        }

        const target = container.querySelector<HTMLElement>(href)

        if (target) {
          event.preventDefault()
          target.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }

      anchor.addEventListener('click', handleAnchorClick)

      return () => anchor.removeEventListener('click', handleAnchorClick)
    })

    cleanupTasks.push(...anchorCleanups)

    const canvas = container.querySelector<HTMLCanvasElement>('#particleCanvas')

    if (canvas) {
      let ctx: CanvasRenderingContext2D | null = null

      try {
        ctx = canvas.getContext('2d')
      } catch {
        ctx = null
      }

      if (ctx) {
        type Particle = {
          x: number
          y: number
          vx: number
          vy: number
          size: number
          baseOpacity: number
        }

        let particles: Particle[] = []
        let mouseX = -1000
        let mouseY = -1000
        let canvasW = 0
        let canvasH = 0
        let particleAnimationId = 0

        const resizeCanvas = () => {
          canvasW = canvas.width = window.innerWidth
          canvasH = canvas.height = window.innerHeight
          const count = Math.min(Math.floor((canvasW * canvasH) / 8000), 180)
          particles = Array.from({ length: count }, () => ({
            x: Math.random() * canvasW,
            y: Math.random() * canvasH,
            vx: (Math.random() - 0.5) * 0.4,
            vy: (Math.random() - 0.5) * 0.4,
            size: Math.random() * 1.8 + 0.6,
            baseOpacity: Math.random() * 0.5 + 0.2,
          }))
        }

        const handleMouseMove = (event: MouseEvent) => {
          mouseX = event.clientX
          mouseY = event.clientY
        }

        const handleMouseLeave = () => {
          mouseX = -1000
          mouseY = -1000
        }

        const animateParticles = () => {
          ctx.clearRect(0, 0, canvasW, canvasH)

          for (const particle of particles) {
            particle.x += particle.vx
            particle.y += particle.vy

            if (particle.x < -20) particle.x = canvasW + 20
            if (particle.x > canvasW + 20) particle.x = -20
            if (particle.y < -20) particle.y = canvasH + 20
            if (particle.y > canvasH + 20) particle.y = -20

            const dx = mouseX - particle.x
            const dy = mouseY - particle.y
            const dist = Math.hypot(dx, dy)
            let opacity = particle.baseOpacity

            if (dist < 140 && mouseX > -500) {
              const force = (1 - dist / 140) * 0.6
              particle.vx += dx * force * 0.002
              particle.vy += dy * force * 0.002
              opacity = Math.min(particle.baseOpacity + 0.35, 0.8)
            }

            particle.vx *= 0.999
            particle.vy *= 0.999

            const speed = Math.hypot(particle.vx, particle.vy)

            if (speed > 0.9) {
              particle.vx = (particle.vx / speed) * 0.9
              particle.vy = (particle.vy / speed) * 0.9
            }

            ctx.beginPath()
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
            ctx.fillStyle = `rgba(180,170,220,${opacity})`
            ctx.fill()
          }

          for (let i = 0; i < particles.length; i += 1) {
            for (let j = i + 1; j < particles.length; j += 1) {
              const dx = particles[i].x - particles[j].x
              const dy = particles[i].y - particles[j].y
              const dist = Math.hypot(dx, dy)

              if (dist < 100) {
                ctx.beginPath()
                ctx.moveTo(particles[i].x, particles[i].y)
                ctx.lineTo(particles[j].x, particles[j].y)
                ctx.strokeStyle = `rgba(140,130,200,${0.06 * (1 - dist / 100)})`
                ctx.lineWidth = 0.5
                ctx.stroke()
              }
            }
          }

          particleAnimationId = window.requestAnimationFrame(animateParticles)
        }

        window.addEventListener('resize', resizeCanvas)
        window.addEventListener('mousemove', handleMouseMove)
        window.addEventListener('mouseleave', handleMouseLeave)
        resizeCanvas()
        animateParticles()

        cleanupTasks.push(() => {
          window.cancelAnimationFrame(particleAnimationId)
          window.removeEventListener('resize', resizeCanvas)
          window.removeEventListener('mousemove', handleMouseMove)
          window.removeEventListener('mouseleave', handleMouseLeave)
        })
      }
    }

    const cursor = container.querySelector<HTMLElement>('#cursor')
    const cursorDot = container.querySelector<HTMLElement>('#cursorDot')

    if (cursor && cursorDot) {
      let cursorX = 0
      let cursorY = 0
      let delayedX = 0
      let delayedY = 0
      let cursorAnimationId = 0

      const handleCursorMove = (event: MouseEvent) => {
        cursorX = event.clientX
        cursorY = event.clientY
      }

      const animateCursor = () => {
        delayedX += (cursorX - delayedX) * 0.35
        delayedY += (cursorY - delayedY) * 0.35
        cursor.style.left = `${cursorX}px`
        cursor.style.top = `${cursorY}px`
        cursorDot.style.left = `${delayedX}px`
        cursorDot.style.top = `${delayedY}px`
        cursorAnimationId = window.requestAnimationFrame(animateCursor)
      }

      document.addEventListener('mousemove', handleCursorMove)
      animateCursor()

      const interactiveCleanups = Array.from(
        container.querySelectorAll<HTMLElement>('a,button,.clickable,.card-interactive,input,textarea,.btn'),
      ).map((element) => {
        const handleEnter = () => {
          cursor.classList.add('hovering')
          cursorDot.classList.add('hovering')
        }

        const handleLeave = () => {
          cursor.classList.remove('hovering')
          cursorDot.classList.remove('hovering')
        }

        element.addEventListener('mouseenter', handleEnter)
        element.addEventListener('mouseleave', handleLeave)

        return () => {
          element.removeEventListener('mouseenter', handleEnter)
          element.removeEventListener('mouseleave', handleLeave)
        }
      })

      cleanupTasks.push(...interactiveCleanups)
      cleanupTasks.push(() => {
        window.cancelAnimationFrame(cursorAnimationId)
        document.removeEventListener('mousemove', handleCursorMove)
      })
    }

    return () => {
      if (closeModalTimeoutId !== null) {
        window.clearTimeout(closeModalTimeoutId)
      }

      cleanupTasks.forEach((cleanup) => cleanup())
      document.body.style.overflow = ''
      container.innerHTML = ''
      managedHeadNodes.forEach((node) => node.remove())
    }
  }, [])

  return (
    <section className="landing-page-shell" aria-label="报名首页" ref={containerRef} />
  )
}

function ToolbarActions({
  me,
  onLogout,
}: {
  me: SessionUser | null
  onLogout: () => Promise<void>
}) {
  return (
    <div className="gallery-actions">
      {me ? (
        <>
          <a className="ghost-button" href="#/submit">
            提交作品
          </a>
          <a className="ghost-button" href="#/my">
            我的作品
          </a>
          {me.isAdmin ? (
            <a className="ghost-button" href="#/admin">
              审核台
            </a>
          ) : null}
          <button className="ghost-button" type="button" onClick={() => void onLogout()}>
            退出登录
          </button>
        </>
      ) : (
        <>
          <a className="ghost-button" href="#/auth?next=%2Fsubmit">
            登录
          </a>
          <a className="ghost-button" href="#/auth?next=%2Fsubmit">
            提交作品
          </a>
        </>
      )}
    </div>
  )
}

function AuthPage({
  next,
  onVerified,
  onNotice,
}: {
  next: string
  onVerified: (user: SessionUser) => void
  onNotice: (message: string) => void
}) {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleRequestCode() {
    try {
      setSubmitting(true)
      const response = await requestCode(email)
      setSent(true)
      onNotice(response.message)
    } catch (error) {
      onNotice(error instanceof Error ? error.message : '验证码发送失败')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleVerify() {
    try {
      setSubmitting(true)
      const response = await verifyCode(email, code)
      onVerified(response.user)
      onNotice('登录成功')
      goTo(next)
    } catch (error) {
      onNotice(error instanceof Error ? error.message : '登录失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="form-page" aria-labelledby="auth-title">
      <div className="detail-toolbar">
        <a className="secondary-link back-link" href="#/gallery">
          返回作品广场
        </a>
      </div>
      <article className="detail-card form-card">
        <div className="section-heading">
          <p className="eyebrow">登录</p>
          <h1 id="auth-title">邮箱验证码登录</h1>
          <p className="form-copy">登录后才能提交作品和管理自己的作品。</p>
        </div>
        <label className="field">
          <span>邮箱</span>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            placeholder="you@example.com"
          />
        </label>
        {sent ? (
          <label className="field">
            <span>验证码</span>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              inputMode="numeric"
              placeholder="输入 6 位验证码"
            />
          </label>
        ) : null}
        <div className="form-actions">
          {!sent ? (
            <button className="primary-button" type="button" onClick={() => void handleRequestCode()} disabled={submitting}>
              {submitting ? '发送中...' : '发送验证码'}
            </button>
          ) : (
            <>
              <button className="primary-button" type="button" onClick={() => void handleVerify()} disabled={submitting}>
                {submitting ? '登录中...' : '确认登录'}
              </button>
              <button className="ghost-button" type="button" onClick={() => void handleRequestCode()} disabled={submitting}>
                重新发送
              </button>
            </>
          )}
        </div>
      </article>
    </section>
  )
}

function SubmitPage({
  me,
  onSubmitted,
  onNotice,
}: {
  me: SessionUser | null
  onSubmitted: () => void
  onNotice: (message: string) => void
}) {
  const [track, setTrack] = useState<Track>('landing')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [externalUrl, setExternalUrl] = useState('')
  const [platformType, setPlatformType] = useState<PlatformType>('website')
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [extraFiles, setExtraFiles] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)
  const coverInputId = 'cover-upload-input'
  const extraInputId = 'extra-upload-input'
  const titleLength = title.trim().length
  const descriptionLength = description.trim().length
  const authorLength = authorName.trim().length
  const titleTooLong = titleLength > TITLE_MAX
  const descriptionTooLong = descriptionLength > DESCRIPTION_MAX
  const authorTooLong = authorLength > AUTHOR_MAX

  async function handleSubmit() {
    if (!me) {
      goTo('/auth?next=%2Fsubmit')
      return
    }

    if (titleLength === 0) {
      onNotice('请填写作品标题')
      return
    }

    if (titleTooLong) {
      onNotice(`作品标题不能超过 ${TITLE_MAX} 个字`)
      return
    }

    if (descriptionLength === 0) {
      onNotice('请填写作品说明')
      return
    }

    if (descriptionTooLong) {
      onNotice(`作品说明不能超过 ${DESCRIPTION_MAX} 个字`)
      return
    }

    if (authorLength === 0) {
      onNotice('请填写群昵称')
      return
    }

    if (authorTooLong) {
      onNotice(`群昵称不能超过 ${AUTHOR_MAX} 个字`)
      return
    }

    if (track === 'landing' && !externalUrl.trim()) {
      onNotice('落地作品请填写作品链接')
      return
    }

    if (track === 'landing' && !coverFile) {
      onNotice('落地作品请上传封面图')
      return
    }

    const totalImages = (coverFile ? 1 : 0) + extraFiles.length

    if (totalImages > 9) {
      onNotice('图片总数最多 9 张')
      return
    }

    try {
      setSubmitting(true)
      onNotice('正在上传图片...')
      const coverImage = coverFile ? await uploadImage(coverFile) : null
      const images = []

      for (const file of extraFiles) {
        images.push(await uploadImage(file))
      }

      onNotice('正在提交作品...')
      await createWork({
        track,
        title: title.trim(),
        description: description.trim(),
        authorName: authorName.trim(),
        externalUrl: externalUrl.trim() || null,
        platformType: track === 'landing' ? platformType : 'none',
        coverImage,
        images,
      })
      setTitle('')
      setDescription('')
      setAuthorName('')
      setExternalUrl('')
      setCoverFile(null)
      setExtraFiles([])
      onNotice('作品已提交，等待审核')
      onSubmitted()
      goTo('/my')
    } catch (error) {
      onNotice(error instanceof Error ? error.message : '提交失败')
    } finally {
      setSubmitting(false)
    }
  }

  if (!me) {
    return (
      <section className="form-page" aria-labelledby="submit-title">
        <article className="detail-card form-card">
          <div className="section-heading">
            <p className="eyebrow">提交作品</p>
            <h1 id="submit-title">请先登录</h1>
            <p className="form-copy">登录后才能提交作品、上传图片和查看自己的审核状态。</p>
          </div>
          <div className="form-actions">
            <a className="primary-button" href="#/auth?next=%2Fsubmit">
              去登录
            </a>
          </div>
        </article>
      </section>
    )
  }

  return (
    <section className="form-page" aria-labelledby="submit-title">
      <div className="detail-toolbar">
        <a className="secondary-link back-link" href="#/gallery">
          返回作品广场
        </a>
      </div>
      <article className="detail-card form-card">
        <div className="section-heading">
          <p className="eyebrow">提交作品</p>
          <h1 id="submit-title">登录后直接交作品</h1>
          <p className="form-copy">
            当前只支持图片上传；视频类作品请填写平台链接并带上 #刀盾杯 标签；如果是未上线 APP等，请先上传到百度网盘等平台，再把分享链接填在作品链接里。
          </p>
        </div>

        <div className="inline-choice">
          <button
            className={track === 'landing' ? 'filter-pill active' : 'filter-pill'}
            type="button"
            onClick={() => {
              setTrack('landing')
              setPlatformType('website')
            }}
          >
            落地作品
          </button>
          <button
            className={track === 'idea' ? 'filter-pill active' : 'filter-pill'}
            type="button"
            onClick={() => {
              setTrack('idea')
              setPlatformType('none')
            }}
          >
            纯想法
          </button>
        </div>

        <label className="field">
          <span>作品标题</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={TITLE_MAX}
            placeholder="给你的作品起个名"
          />
          <small className={titleTooLong ? 'field-counter over' : 'field-counter'}>
            {titleLength}/{TITLE_MAX}
          </small>
        </label>

        <label className="field">
          <span>作品说明</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={6}
            maxLength={DESCRIPTION_MAX}
            placeholder="把作品讲清楚，评委和围观群众都看这个"
          />
          <small className={descriptionTooLong ? 'field-counter over' : 'field-counter'}>
            {descriptionLength}/{DESCRIPTION_MAX}
          </small>
        </label>

        <label className="field">
          <span>群昵称</span>
          <input
            value={authorName}
            onChange={(event) => setAuthorName(event.target.value)}
            maxLength={AUTHOR_MAX}
            placeholder="比如：匿名 / 刀盾 / 你的小队名"
          />
          <small className={authorTooLong ? 'field-counter over' : 'field-counter'}>
            {authorLength}/{AUTHOR_MAX}
          </small>
        </label>

        {track === 'landing' ? (
          <>
            <label className="field">
              <span>作品链接</span>
              <input value={externalUrl} onChange={(event) => setExternalUrl(event.target.value)} placeholder="网站、小程序介绍页、抖音/B 站链接等" />
            </label>
            <label className="field">
              <span>链接类型</span>
              <select value={platformType} onChange={(event) => setPlatformType(event.target.value as PlatformType)}>
                <option value="website">网站 / Demo 链接</option>
                <option value="douyin">抖音</option>
                <option value="bilibili">B 站</option>
                <option value="offline_app">网盘链接</option>
                <option value="other">其他平台</option>
              </select>
            </label>
            {(platformType === 'douyin' || platformType === 'bilibili') ? (
              <p className="helper-text">AI 视频作品发布到平台时请带上 #刀盾杯 标签，再提交作品链接。</p>
            ) : null}
            {platformType === 'offline_app' ? (
              <p className="helper-text">未上线 APP 请存放到百度网盘等平台，并在作品链接中填写可访问的分享链接。</p>
            ) : null}
          </>
        ) : null}

        <div className="field upload-field">
          <span>{track === 'landing' ? '封面图（必传）' : '封面图（可选）'}</span>
          <input
            id={coverInputId}
            className="hidden-file-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => setCoverFile(event.target.files?.[0] ?? null)}
          />
          <label className="upload-trigger" htmlFor={coverInputId}>
            {coverFile ? '重新选择封面图' : '选择封面图'}
          </label>
          <small>{coverFile ? coverFile.name : '支持 jpg/png/webp，单图最大 20MB'}</small>
        </div>

        <div className="field upload-field">
          <span>补充图片（最多 8 张）</span>
          <input
            id={extraInputId}
            className="hidden-file-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(event) => setExtraFiles(Array.from(event.target.files ?? []))}
          />
          <label className="upload-trigger" htmlFor={extraInputId}>
            {extraFiles.length ? `已选择 ${extraFiles.length} 张，点击重选` : '选择补充图片'}
          </label>
          <small>
            {extraFiles.length
              ? extraFiles.map((file) => file.name).join(' / ')
              : '支持多选，全部图片总数不超过 9 张'}
          </small>
        </div>

        <div className="form-actions">
          <button className="primary-button" type="button" onClick={() => void handleSubmit()} disabled={submitting}>
            {submitting ? '提交中...' : '提交作品'}
          </button>
        </div>
      </article>
    </section>
  )
}

function EditWorkPage({
  me,
  workId,
  onUpdated,
  onNotice,
}: {
  me: SessionUser | null
  workId: string
  onUpdated: () => Promise<void>
  onNotice: (message: string) => void
}) {
  type DraftImage =
    | { id: string; kind: 'existing'; url: string }
    | { id: string; kind: 'new'; file: File; previewUrl: string }

  const [loadingWork, setLoadingWork] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [track, setTrack] = useState<Track>('landing')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [externalUrl, setExternalUrl] = useState('')
  const [platformType, setPlatformType] = useState<PlatformType>('website')
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [images, setImages] = useState<DraftImage[]>([])
  const notify = useEffectEvent(onNotice)
  const coverInputId = `edit-cover-${workId}`
  const extraInputId = `edit-extra-${workId}`

  const titleLength = title.trim().length
  const descriptionLength = description.trim().length
  const authorLength = authorName.trim().length
  const totalImages = (coverImageUrl || coverFile ? 1 : 0) + images.length

  useEffect(
    () => () => {
      for (const image of images) {
        if (image.kind === 'new') {
          URL.revokeObjectURL(image.previewUrl)
        }
      }
    },
    [images],
  )

  useEffect(() => {
    async function loadWork() {
      try {
        setLoadingWork(true)
        const response = await fetchWork(workId)
        const work = response.work
        setTrack(work.track)
        setTitle(work.title)
        setDescription(work.description)
        setAuthorName(work.authorName)
        setExternalUrl(work.externalUrl ?? '')
        setPlatformType(work.platformType)
        setCoverImageUrl(work.coverImageUrl ?? null)
        setCoverFile(null)
        setImages(
          work.imageUrls.map((url, index) => ({
            id: `existing-${index}-${url}`,
            kind: 'existing' as const,
            url,
          })),
        )
        setNotFound(false)
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          setNotFound(true)
          return
        }
        notify(error instanceof Error ? error.message : '作品加载失败')
      } finally {
        setLoadingWork(false)
      }
    }

    void loadWork()
  }, [workId])

  async function handleSave() {
    if (!title.trim()) {
      onNotice('请填写作品标题')
      return
    }

    if (titleLength > TITLE_MAX) {
      onNotice(`作品标题不能超过 ${TITLE_MAX} 个字`)
      return
    }

    if (!description.trim()) {
      onNotice('请填写作品说明')
      return
    }

    if (descriptionLength > DESCRIPTION_MAX) {
      onNotice(`作品说明不能超过 ${DESCRIPTION_MAX} 个字`)
      return
    }

    if (!authorName.trim()) {
      onNotice('请填写群昵称')
      return
    }

    if (authorLength > AUTHOR_MAX) {
      onNotice(`群昵称不能超过 ${AUTHOR_MAX} 个字`)
      return
    }

    if (track === 'landing' && !externalUrl.trim()) {
      onNotice('落地作品请填写作品链接')
      return
    }

    if (track === 'landing' && !coverImageUrl && !coverFile) {
      onNotice('落地作品请上传封面图')
      return
    }

    if (totalImages > 9) {
      onNotice('图片总数最多 9 张')
      return
    }

    try {
      setSaving(true)
      const uploadedCover = coverFile ? await uploadImage(coverFile) : null
      const imageAssets = []

      for (const image of images) {
        if (image.kind === 'existing') {
          imageAssets.push({ url: image.url })
          continue
        }

        imageAssets.push(await uploadImage(image.file))
      }

      await updateWork(workId, {
        title: title.trim(),
        description: description.trim(),
        authorName: authorName.trim(),
        externalUrl: track === 'landing' ? (externalUrl.trim() || null) : null,
        platformType: track === 'landing' ? platformType : 'none',
        coverImage: uploadedCover ?? (coverImageUrl ? { url: coverImageUrl } : null),
        images: imageAssets,
      })
      onNotice('作品已更新，重新进入审核队列')
      await onUpdated()
      goTo('/my')
    } catch (error) {
      onNotice(error instanceof Error ? error.message : '更新失败')
    } finally {
      setSaving(false)
    }
  }

  if (!me) {
    return (
      <section className="form-page" aria-labelledby="edit-title">
        <article className="detail-card form-card">
          <div className="section-heading">
            <p className="eyebrow">编辑作品</p>
            <h1 id="edit-title">请先登录</h1>
            <p className="form-copy">登录后才能编辑自己的作品。</p>
          </div>
          <div className="form-actions">
            <a className="primary-button" href={`#/auth?next=${encodeURIComponent(`/edit/${workId}`)}`}>
              去登录
            </a>
          </div>
        </article>
      </section>
    )
  }

  if (loadingWork) {
    return (
      <section className="form-page">
        <article className="detail-card form-card">
          <p className="form-copy">正在加载作品...</p>
        </article>
      </section>
    )
  }

  if (notFound) {
    return (
      <section className="form-page">
        <article className="detail-card form-card">
          <h1>作品不存在</h1>
          <p className="form-copy">这个作品不存在，或你没有编辑权限。</p>
          <a className="primary-button" href="#/my">
            返回我的作品
          </a>
        </article>
      </section>
    )
  }

  return (
    <section className="form-page" aria-labelledby="edit-title">
      <div className="detail-toolbar">
        <a className="secondary-link back-link" href="#/my">
          返回我的作品
        </a>
      </div>
      <article className="detail-card form-card">
        <div className="section-heading">
          <p className="eyebrow">编辑作品</p>
          <h1 id="edit-title">修改后将重新进入审核</h1>
          <p className="helper-text">字数限制：标题 1-30 字，作品说明 1-1200 字，群昵称 1-15 字。</p>
        </div>

        <label className="field">
          <span>作品标题</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={TITLE_MAX} />
          <small className="field-counter">{titleLength}/{TITLE_MAX}</small>
        </label>

        <label className="field">
          <span>作品说明</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={6}
            maxLength={DESCRIPTION_MAX}
          />
          <small className="field-counter">{descriptionLength}/{DESCRIPTION_MAX}</small>
        </label>

        <label className="field">
          <span>群昵称</span>
          <input value={authorName} onChange={(event) => setAuthorName(event.target.value)} maxLength={AUTHOR_MAX} />
          <small className="field-counter">{authorLength}/{AUTHOR_MAX}</small>
        </label>

        {track === 'landing' ? (
          <>
            <label className="field">
              <span>作品链接</span>
              <input value={externalUrl} onChange={(event) => setExternalUrl(event.target.value)} />
            </label>
            <label className="field">
              <span>链接类型</span>
              <select value={platformType} onChange={(event) => setPlatformType(event.target.value as PlatformType)}>
                <option value="website">网站 / Demo</option>
                <option value="douyin">抖音</option>
                <option value="bilibili">B 站</option>
                <option value="offline_app">未上线 APP（网盘链接）</option>
                <option value="other">其他平台</option>
              </select>
            </label>
          </>
        ) : null}

        <div className="field upload-field">
          <span>{track === 'landing' ? '封面图（必传）' : '封面图（可选）'}</span>
          {coverImageUrl ? (
            <img className="detail-gallery-media" src={coverImageUrl} alt="当前封面图" />
          ) : null}
          <input
            id={coverInputId}
            className="hidden-file-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null

              if (!file) {
                return
              }

              setCoverFile(file)
              setCoverImageUrl(URL.createObjectURL(file))
            }}
          />
          <div className="card-actions">
            <label className="upload-trigger" htmlFor={coverInputId}>
              {coverImageUrl ? '更换封面图' : '选择封面图'}
            </label>
            {coverImageUrl ? (
              <button
                className="ghost-button"
                type="button"
                onClick={() => {
                  setCoverImageUrl(null)
                  setCoverFile(null)
                }}
              >
                删除封面图
              </button>
            ) : null}
          </div>
        </div>

        <div className="field upload-field">
          <span>补充图片（最多 8 张）</span>
          <input
            id={extraInputId}
            className="hidden-file-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(event) => {
              const files = Array.from(event.target.files ?? [])
              if (!files.length) {
                return
              }

              const appended = files.map((file) => ({
                id: `new-${crypto.randomUUID()}`,
                kind: 'new' as const,
                file,
                previewUrl: URL.createObjectURL(file),
              }))

              setImages((prev) => [...prev, ...appended])
            }}
          />
          <label className="upload-trigger" htmlFor={extraInputId}>
            添加补充图片
          </label>
          {images.length ? (
            <div className="detail-gallery">
              {images.map((image) => (
                <div className="field" key={image.id}>
                  <img
                    className="detail-gallery-media"
                    src={image.kind === 'existing' ? image.url : image.previewUrl}
                    alt="补充图片预览"
                  />
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={() => {
                      setImages((prev) => prev.filter((item) => item.id !== image.id))
                    }}
                  >
                    删除这张图
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          <small>当前共 {(coverImageUrl || coverFile ? 1 : 0) + images.length}/9 张图片</small>
        </div>

        <div className="form-actions">
          <button className="primary-button" type="button" onClick={() => void handleSave()} disabled={saving}>
            {saving ? '保存中...' : '保存修改'}
          </button>
        </div>
      </article>
    </section>
  )
}

function StatusBadge({ status }: { status: string | undefined }) {
  const labelMap = {
    pending: '待审核',
    approved: '已通过',
    rejected: '未通过',
  } as const

  return <span className={`status-badge ${status ?? 'pending'}`}>{labelMap[status as keyof typeof labelMap] ?? '待审核'}</span>
}

function MyWorksPage({ works, onDelete }: { works: PublicWork[]; onDelete: (id: string) => Promise<void> }) {
  return (
    <section className="gallery-page" aria-labelledby="my-works-title">
      <div className="detail-toolbar">
        <a className="secondary-link back-link" href="#/gallery">
          返回作品广场
        </a>
      </div>
      <div className="section-heading">
        <p className="eyebrow">我的作品</p>
        <h1 id="my-works-title">提交记录与审核状态</h1>
      </div>
      {works.length ? (
        <div className="works-grid">
          {works.map((work) => (
            <article className="work-card" key={work.id}>
              {work.coverImageUrl ? <img className="work-cover" src={work.coverImageUrl} alt={`${work.title} 封面图`} /> : null}
              <div className="card-topline">
                <StatusBadge status={work.status} />
                <span className="meta-text">{work.track === 'landing' ? '落地作品' : '纯想法'}</span>
              </div>
              <h3>{work.title}</h3>
              <p>{getGalleryDescription(work.description)}</p>
              {work.rejectReason ? <p className="reject-copy">驳回原因：{work.rejectReason}</p> : null}
              <div className="card-actions">
                <a className="card-button" href={`#/work/${work.id}`}>
                  查看详情
                </a>
                <a className="ghost-button" href={`#/edit/${work.id}`}>
                  编辑
                </a>
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => {
                    if (window.confirm('确认删除这个作品吗？删除后不可恢复。')) {
                      void onDelete(work.id)
                    }
                  }}
                >
                  删除
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <article className="info-card">
          <p>你还没有提交过作品。</p>
          <a className="primary-button" href="#/submit">
            现在提交
          </a>
        </article>
      )}
    </section>
  )
}

function AdminPage({
  me,
  works,
  onApprove,
  onReject,
}: {
  me: SessionUser | null
  works: PublicWork[]
  onApprove: (id: string) => Promise<void>
  onReject: (id: string, reason: string) => Promise<void>
}) {
  if (!me?.isAdmin) {
    return (
      <section className="form-page" aria-labelledby="admin-title">
        <article className="detail-card form-card">
          <h1 id="admin-title">没有管理员权限</h1>
          <p className="form-copy">只有管理员邮箱登录后才能进入审核台。</p>
        </article>
      </section>
    )
  }

  return (
    <section className="gallery-page" aria-labelledby="admin-title">
      <div className="detail-toolbar">
        <a className="secondary-link back-link" href="#/gallery">
          返回作品广场
        </a>
      </div>
      <div className="section-heading">
        <p className="eyebrow">审核台</p>
        <h1 id="admin-title">待审核作品</h1>
      </div>
      {works.length ? (
        <div className="works-grid">
          {works.map((work) => (
            <article className="work-card" key={work.id}>
              {work.coverImageUrl ? <img className="work-cover" src={work.coverImageUrl} alt={`${work.title} 封面图`} /> : null}
              <h3>{work.title}</h3>
              <p>{getGalleryDescription(work.description)}</p>
              <p className="meta-text">群昵称：{work.authorName}</p>
              <p className="meta-text">邮箱：{work.ownerEmail}</p>
              <div className="card-actions">
                <button className="ghost-button" type="button" onClick={() => void onApprove(work.id)}>
                  通过
                </button>
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => {
                    const reason = window.prompt('填写驳回原因', '内容待完善')

                    if (reason !== null) {
                      void onReject(work.id, reason)
                    }
                  }}
                >
                  驳回
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <article className="info-card">
          <p>当前没有待审核作品。</p>
        </article>
      )}
    </section>
  )
}

function App() {
  const [currentPage, setCurrentPage] = useState<CurrentPage>(() => getCurrentPage())
  const [activeFilter, setActiveFilter] = useState<GalleryFilter>('all')
  const [notice, setNotice] = useState('')
  const [wechatReady, setWechatReady] = useState(false)
  const [me, setMe] = useState<SessionUser | null>(null)
  const [liveWorks, setLiveWorks] = useState<PublicWork[]>([])
  const [detailWork, setDetailWork] = useState<PublicWork | null>(null)
  const [myWorks, setMyWorks] = useState<PublicWork[]>([])
  const [adminWorks, setAdminWorks] = useState<PublicWork[]>([])
  const [sharePosterOpen, setSharePosterOpen] = useState(false)
  const [sharePosterLoading, setSharePosterLoading] = useState(false)
  const [sharePosterUrl, setSharePosterUrl] = useState<string | null>(null)
  const [sharePosterDownloadUrl, setSharePosterDownloadUrl] = useState<string | null>(null)
  const [sharePosterError, setSharePosterError] = useState('')
  const [sharePosterWarning, setSharePosterWarning] = useState('')
  const [loading, setLoading] = useState({
    me: true,
    gallery: false,
    detail: false,
    my: false,
    admin: false,
  })
  const isWechatClient = isWeChatBrowser(window.navigator.userAgent)

  useEffect(() => {
    const syncPage = () => {
      setCurrentPage(getCurrentPage())
    }

    window.addEventListener('hashchange', syncPage)

    return () => {
      window.removeEventListener('hashchange', syncPage)
    }
  }, [])

  useEffect(() => {
    void refreshMe()
  }, [])

  useEffect(() => {
    if (!isWechatClient) {
      return
    }

    let disposed = false

    async function initWechatShare() {
      try {
        const wx = await loadWechatSdk()
        const signature = await fetchWechatJssdkSignature(getWechatSignatureUrl(window.location.href))

        wx.config({
          appId: signature.appId,
          timestamp: signature.timestamp,
          nonceStr: signature.nonceStr,
          signature: signature.signature,
          jsApiList: [
            'updateAppMessageShareData',
            'updateTimelineShareData',
            'onMenuShareAppMessage',
            'onMenuShareTimeline',
          ],
        })

        wx.ready(() => {
          if (!disposed) {
            setWechatReady(true)
          }
        })

        wx.error((error) => {
          console.error('WeChat JSSDK config failed', error)

          if (!disposed) {
            setWechatReady(false)
          }
        })
      } catch (error) {
        console.error('WeChat JSSDK init failed', error)
      }
    }

    void initWechatShare()

    return () => {
      disposed = true
    }
  }, [isWechatClient])

  useEffect(() => {
    if (currentPage.page === 'detail') {
      void refreshDetail(currentPage.workId)
    }

    if (currentPage.page === 'my') {
      void refreshMyWorks()
    }

    if (currentPage.page === 'admin') {
      void refreshAdminWorks()
    }
  }, [currentPage])

  useEffect(() => {
    if (currentPage.page === 'detail' && me) {
      void refreshMyWorks()
    }
  }, [currentPage.page, me])

  useEffect(() => {
    if (currentPage.page === 'gallery') {
      void refreshGallery(activeFilter)
    }
  }, [activeFilter, currentPage.page])

  async function refreshMe() {
    try {
      setLoading((prev) => ({ ...prev, me: true }))
      const response = await fetchMe()
      setMe(response.user)
    } catch {
      setMe(null)
    } finally {
      setLoading((prev) => ({ ...prev, me: false }))
    }
  }

  async function refreshGallery(track: GalleryFilter) {
    try {
      setLoading((prev) => ({ ...prev, gallery: true }))
      const response = await fetchWorks(track === 'all' ? 'all' : track)
      setLiveWorks(
        response.works.map((work) => ({
          ...work,
          imageUrls: [],
          source: 'live' as const,
        })),
      )
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 404)) {
        setNotice(error instanceof Error ? error.message : '作品广场加载失败')
      }
      setLiveWorks([])
    } finally {
      setLoading((prev) => ({ ...prev, gallery: false }))
    }
  }

  async function refreshDetail(workId: string) {
    try {
      setLoading((prev) => ({ ...prev, detail: true }))
      const response = await fetchWork(workId)
      setDetailWork({
        ...response.work,
        source: 'live',
      })
    } catch (error) {
      setDetailWork(null)
      if (!(error instanceof ApiError && error.status === 404)) {
        setNotice(error instanceof Error ? error.message : '作品详情加载失败')
      }
    } finally {
      setLoading((prev) => ({ ...prev, detail: false }))
    }
  }

  async function refreshMyWorks() {
    try {
      setLoading((prev) => ({ ...prev, my: true }))
      const response = await fetchMyWorks()
      setMyWorks(response.works.map((work) => ({ ...work, source: 'live' })))
    } catch (error) {
      setMyWorks([])
      setNotice(error instanceof Error ? error.message : '我的作品加载失败')
    } finally {
      setLoading((prev) => ({ ...prev, my: false }))
    }
  }

  async function refreshAdminWorks() {
    try {
      setLoading((prev) => ({ ...prev, admin: true }))
      const response = await fetchPendingWorks()
      setAdminWorks(response.works.map((work) => ({ ...work, source: 'live' })))
    } catch (error) {
      setAdminWorks([])
      setNotice(error instanceof Error ? error.message : '审核台加载失败')
    } finally {
      setLoading((prev) => ({ ...prev, admin: false }))
    }
  }

  async function handleLogout() {
    try {
      await logout()
      setMe(null)
      setNotice('已退出登录')
      goTo('/gallery')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '退出登录失败')
    }
  }

  async function handleApprove(id: string) {
    try {
      await approveWork(id)
      setNotice('作品已通过审核')
      await refreshAdminWorks()
      await refreshGallery(activeFilter)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '审核通过失败')
    }
  }

  async function handleReject(id: string, reason: string) {
    try {
      await rejectWork(id, reason)
      setNotice('作品已驳回')
      await refreshAdminWorks()
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '驳回失败')
    }
  }

  async function handleDeleteMyWork(id: string) {
    try {
      await deleteWork(id)
      setNotice('作品已删除')
      await refreshMyWorks()
      await refreshGallery(activeFilter)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '删除失败')
    }
  }

  async function copyText(value: string) {
    try {
      await navigator.clipboard.writeText(value)
      setNotice('链接已复制')
    } catch {
      setNotice('复制失败，请手动复制')
    }
  }

  async function openSharePoster(work: PublicWork) {
    setSharePosterOpen(true)
    setSharePosterLoading(true)
    setSharePosterError('')
    setSharePosterWarning('')

    try {
      setSharePosterUrl(() => null)
      setSharePosterDownloadUrl((currentUrl) => {
        if (currentUrl) {
          URL.revokeObjectURL(currentUrl)
        }

        return null
      })

      const posterResult = await createWorkSharePoster({
        title: work.title,
        description: work.description,
        coverImageUrl: work.coverImageUrl ?? work.imageUrls[0] ?? null,
        shareUrl: `${window.location.origin}${window.location.pathname}#/work/${work.id}`,
      })

      if (posterResult.coverLoadError) {
        console.error('Share poster cover failed', {
          origin: window.location.origin,
          coverImageUrl: work.coverImageUrl ?? work.imageUrls[0] ?? null,
          error: posterResult.coverLoadError,
        })
        setSharePosterWarning(`封面图未能载入，已使用标题占位：${posterResult.coverLoadError}`)
      }

      setSharePosterUrl(posterResult.dataUrl)
      setSharePosterDownloadUrl(URL.createObjectURL(posterResult.blob))
    } catch (error) {
      setSharePosterError(error instanceof Error ? error.message : '海报生成失败，请稍后再试')
    } finally {
      setSharePosterLoading(false)
    }
  }

  function closeSharePoster() {
    setSharePosterOpen(false)
  }

  function downloadSharePoster() {
    if (!sharePosterDownloadUrl || !currentShareWork) {
      return
    }

    const anchor = document.createElement('a')
    anchor.href = sharePosterDownloadUrl
    anchor.download = `${currentShareWork.title}-分享海报.png`
    anchor.click()

    if (isWechatClient) {
      setNotice('如果微信没有弹出保存，请长按海报图片保存到相册')
    }
  }

  const filteredWorks = liveWorks.filter((work) => {
    if (activeFilter === 'all') {
      return true
    }

    return work.track === activeFilter
  })
  const currentDetail = detailWork
  const currentShareWork =
    currentPage.page === 'detail' && currentDetail?.id === currentPage.workId ? currentDetail : null
  const isOwnDetailWork = !!currentShareWork && !!me && myWorks.some((work) => work.id === currentShareWork.id)

  useEffect(() => {
    if (!isWechatClient || !wechatReady || !window.wx) {
      return
    }

    const shareData = buildWechatShareData({
      currentUrl: window.location.href,
      page:
        currentPage.page === 'home'
          ? 'home'
          : currentPage.page === 'detail' && currentShareWork
            ? 'detail'
            : 'default',
      work: currentShareWork,
    })

    applyWechatShareData(window.wx, shareData)
  }, [currentPage.page, currentShareWork, isWechatClient, wechatReady])

  useEffect(() => {
    const root = document.getElementById('root')
    const isHomePage = currentPage.page === 'home'

    root?.classList.toggle('app-root--home', isHomePage)
    document.body.classList.toggle('app-body--home', isHomePage)

    return () => {
      root?.classList.remove('app-root--home')
      document.body.classList.remove('app-body--home')
    }
  }, [currentPage.page])

  useEffect(() => {
    return () => {
      if (sharePosterUrl) {
        // data URL does not need cleanup
      }

      if (sharePosterDownloadUrl) {
        URL.revokeObjectURL(sharePosterDownloadUrl)
      }
    }
  }, [sharePosterUrl, sharePosterDownloadUrl])

  return (
    <main className={currentPage.page === 'home' ? 'page-shell page-shell--home' : 'page-shell'}>
      {notice ? (
        <div className="notice-banner" role="status">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice('')} aria-label="关闭提示">
            关闭
          </button>
        </div>
      ) : null}

      {currentPage.page === 'home' ? (
        <HomePage />
      ) : null}

      {currentPage.page === 'gallery' ? (
        <section className="gallery-page" aria-label="作品广场">
          <div className="gallery-toolbar">
            <div className="gallery-nav">
              <a className="secondary-link back-link" href="#/">
                返回首页
              </a>
            </div>
            <div className="gallery-filters" role="tablist" aria-label="作品赛道筛选">
              {galleryFilters.map((filter) => (
                <button
                  key={filter.key}
                  className={filter.key === activeFilter ? 'filter-pill active' : 'filter-pill'}
                  type="button"
                  role="tab"
                  aria-selected={filter.key === activeFilter}
                  onClick={() => setActiveFilter(filter.key)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <ToolbarActions me={me} onLogout={handleLogout} />
          </div>
          {loading.gallery && liveWorks.length === 0 ? <p className="meta-text">正在加载作品...</p> : null}
          {!loading.gallery && filteredWorks.length === 0 ? <p className="meta-text">暂无作品，敬请期待。</p> : null}
          <div className="works-grid">
            {filteredWorks.map((work) => (
              <article className="work-card" key={work.id}>
                {work.coverImageUrl ? <img className="work-cover" src={work.coverImageUrl} alt={`${work.title} 封面图`} /> : null}
                <h3>{work.title}</h3>
                <p>{getGalleryDescription(work.description)}</p>
                <a className="card-button" href={`#/work/${work.id}`}>
                  查看详情
                </a>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {currentPage.page === 'detail' ? (
        currentDetail ? (
          <section className="detail-page" aria-labelledby="detail-title">
            <div className="detail-toolbar">
              <a className="secondary-link back-link" href="#/gallery">
                返回作品广场
              </a>
              <ToolbarActions me={me} onLogout={handleLogout} />
            </div>
            <article className="detail-card">
              {currentDetail.coverImageUrl ? (
                <img className="detail-cover" src={currentDetail.coverImageUrl} alt={`${currentDetail.title} 展示图`} />
              ) : null}
              <h1 id="detail-title">{currentDetail.title}</h1>
              <div className="detail-share-bar">
                <p className="meta-text">{isOwnDetailWork ? '分享给自己的朋友看看？' : '觉得作品不错？'}</p>
                <button className="ghost-button" type="button" onClick={() => void openSharePoster(currentDetail)}>
                  分享作品
                </button>
              </div>
              <div className="detail-info">
                <div>
                  <span className="detail-label">群昵称</span>
                  <p>{currentDetail.authorName}</p>
                </div>
                {currentDetail.externalUrl ? (
                  <div>
                    <span className="detail-label">可访问网址</span>
                    <div className="detail-link-row">
                      <a className="detail-link" href={getExternalHref(currentDetail.externalUrl) ?? undefined} target="_blank" rel="noreferrer">
                        {currentDetail.externalUrl}
                      </a>
                      <button className="copy-button" type="button" onClick={() => void copyText(currentDetail.externalUrl ?? '')}>
                        复制
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="detail-block">
                <h2>作品说明</h2>
                <p>{currentDetail.description}</p>
              </div>
              {currentDetail.imageUrls.length ? (
                <div className="detail-block">
                  <h2>作品截图/图片</h2>
                  <div className="detail-gallery">
                    {currentDetail.imageUrls.map((item, index) => (
                      <img key={item} className="detail-gallery-media" src={item} alt={`${currentDetail.title} 截图 ${index + 1}`} />
                    ))}
                  </div>
                </div>
              ) : null}
            </article>
          </section>
        ) : (
          <section className="detail-page" aria-label="作品不存在">
            <div className="detail-card">
              <h1>作品不存在</h1>
              <p>{loading.detail ? '正在加载作品...' : '这个作品链接目前没有对应内容。'}</p>
              <a className="primary-button" href="#/gallery">
                返回作品广场
              </a>
            </div>
          </section>
        )
      ) : null}

      {currentPage.page === 'auth' ? (
        <AuthPage
          next={currentPage.next}
          onVerified={(user) => setMe(user)}
          onNotice={(message) => setNotice(message)}
        />
      ) : null}

      {currentPage.page === 'submit' ? (
        <SubmitPage me={me} onSubmitted={() => void refreshMyWorks()} onNotice={(message) => setNotice(message)} />
      ) : null}

      {currentPage.page === 'edit' ? (
        <EditWorkPage
          me={me}
          workId={currentPage.workId}
          onUpdated={async () => {
            await refreshMyWorks()
            await refreshGallery(activeFilter)
          }}
          onNotice={(message) => setNotice(message)}
        />
      ) : null}

      {currentPage.page === 'my' ? (
        loading.my && myWorks.length === 0 ? (
          <section className="form-page">
            <article className="detail-card form-card">
              <p className="form-copy">正在加载你的作品...</p>
            </article>
          </section>
        ) : (
          <MyWorksPage works={myWorks} onDelete={handleDeleteMyWork} />
        )
      ) : null}

      {currentPage.page === 'admin' ? (
        loading.admin && adminWorks.length === 0 ? (
          <section className="form-page">
            <article className="detail-card form-card">
              <p className="form-copy">正在加载待审核作品...</p>
            </article>
          </section>
        ) : (
          <AdminPage me={me} works={adminWorks} onApprove={handleApprove} onReject={handleReject} />
        )
      ) : null}

      {sharePosterOpen ? (
        <div
          className="share-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-dialog-title"
          onClick={closeSharePoster}
        >
          <div className="share-dialog share-dialog--poster" onClick={(event) => event.stopPropagation()}>
            <p className="eyebrow">作品分享</p>
            <h2 id="share-dialog-title">分享海报</h2>
            <p className="share-copy">
              {isWechatClient ? '长按保存到相册' : '保存图片'}
            </p>
            <div className="share-poster-preview">
              {sharePosterLoading ? <p className="meta-text">正在生成海报...</p> : null}
              {!sharePosterLoading && sharePosterError ? <p className="meta-text">{sharePosterError}</p> : null}
              {!sharePosterLoading && !sharePosterError && sharePosterWarning ? (
                <p className="meta-text share-warning">{sharePosterWarning}</p>
              ) : null}
              {!sharePosterLoading && !sharePosterError && sharePosterUrl ? (
                <img className="share-poster-image" src={sharePosterUrl} alt={`${currentShareWork?.title ?? '作品'} 分享海报`} />
              ) : null}
            </div>
            <div className="share-dialog-actions">
              <button className="ghost-button" type="button" onClick={closeSharePoster}>
                关闭
              </button>
              {isWechatClient ? null : (
                <button
                  className="primary-button"
                  type="button"
                  onClick={downloadSharePoster}
                  disabled={!sharePosterDownloadUrl || sharePosterLoading}
                >
                  保存图片
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {currentPage.page === 'home' ? null : (
        <footer className="site-footer" aria-label="页脚">
          <p>© 2026 QIANLIAI. All rights reserved.</p>
          <p>展示每一个好玩的想法</p>
          {loading.me ? null : me ? <p>当前已登录：{me.email}</p> : null}
        </footer>
      )}
    </main>
  )
}

export default App
