import { useEffect, useState } from 'react'

import './App.css'
import {
  ApiError,
  approveWork,
  createWork,
  fetchMe,
  fetchPendingWorks,
  fetchWork,
  fetchWorks,
  fetchMyWorks,
  logout,
  rejectWork,
  requestCode,
  uploadImage,
  verifyCode,
} from './lib/api'
import { sampleWorks } from './lib/sampleWorks'
import type { PlatformType, PublicWork, SessionUser, Track } from './types'
import prizePreview from './assets/5FC9B1BF14E3034F2CD2E29B48605F13.jpg'
import groupQrCode from './assets/qrcode.jpg'

const registrationUrl =
  'https://wcnahf1otvjt.feishu.cn/share/base/form/shrcntGTeoraX4xm3Tb4OwKmiLd'

const deadline = new Date('2026-05-07T00:00:00+08:00')
const TITLE_MAX = 30
const DESCRIPTION_MAX = 1200
const AUTHOR_MAX = 15

const highlights = [
  '只要是你想实现的、好玩有趣，沾点 AI / 编程，都能来参赛~',
  '纯想法、纯创意也同样可以，不要求你先把作品做得像个正经产品。',
  '参赛即有机会赢取抽象小礼物 (doge)',
]

const tracks = [
  {
    title: '落地赛道',
    description:
      '你可以提交一个可访问的网站、AI 生成视频、Demo 或其他成品；如果暂时没上线，也可以提交截图。（如果是视频，需要发在抖音、B 站等平台上，发布时带上 #刀盾杯 标签，并提交作品链接）',
  },
  {
    title: '纯想法赛道',
    description: '适合脑洞先行的人。可以用文字、图片等方式，把你的想法讲清楚。',
  },
]

const submissionFormats = [
  '可直接访问的网站',
  '小程序名 / APP 名',
  '作品截图',
  'AI 生成视频链接',
  '纯文字描述',
]

const examples = {
  made: [
    '找你妹（嘉豪版）小游戏',
    '嘉豪测试网站：测你是不是嘉豪',
    '一个离谱但真的能用的课表软件',
    '刀盾大战奶龙 AI 生成视频',
  ],
  idea: [
    '我的想法是可以做一个带薪拉屎模拟器，这样我每天就能知道自己拉屎的时候赚了多了钱了，毕竟摸鱼来的才是赚的',
    '感觉能做一个蓝宝红宝紫宝大混战游戏',
    '可以做一个可以做（bushi）',
  ],
}

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

function getTimeLeft(now: number) {
  const diff = Math.max(deadline.getTime() - now, 0)

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  }
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
      onNotice('请填写作者名称')
      return
    }

    if (authorTooLong) {
      onNotice(`作者名称不能超过 ${AUTHOR_MAX} 个字`)
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
          <span>作者名称</span>
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

function StatusBadge({ status }: { status: string | undefined }) {
  const labelMap = {
    pending: '待审核',
    approved: '已通过',
    rejected: '未通过',
  } as const

  return <span className={`status-badge ${status ?? 'pending'}`}>{labelMap[status as keyof typeof labelMap] ?? '待审核'}</span>
}

function MyWorksPage({ works }: { works: PublicWork[] }) {
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
              <a className="card-button" href={`#/work/${work.id}`}>
                查看详情
              </a>
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
              <p className="meta-text">作者：{work.authorName}</p>
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
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(Date.now()))
  const [currentPage, setCurrentPage] = useState<CurrentPage>(() => getCurrentPage())
  const [activeFilter, setActiveFilter] = useState<GalleryFilter>('all')
  const [notice, setNotice] = useState('')
  const [me, setMe] = useState<SessionUser | null>(null)
  const [liveWorks, setLiveWorks] = useState<PublicWork[]>([])
  const [detailWork, setDetailWork] = useState<PublicWork | null>(null)
  const [myWorks, setMyWorks] = useState<PublicWork[]>([])
  const [adminWorks, setAdminWorks] = useState<PublicWork[]>([])
  const [loading, setLoading] = useState({
    me: true,
    gallery: false,
    detail: false,
    my: false,
    admin: false,
  })

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTimeLeft(getTimeLeft(Date.now()))
    }, 1000)

    return () => {
      window.clearInterval(timer)
    }
  }, [])

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

  async function copyText(value: string) {
    try {
      await navigator.clipboard.writeText(value)
      setNotice('链接已复制')
    } catch {
      setNotice('复制失败，请手动复制')
    }
  }

  const countdownItems = [
    { label: '天', value: timeLeft.days },
    { label: '时', value: timeLeft.hours },
    { label: '分', value: timeLeft.minutes },
    { label: '秒', value: timeLeft.seconds },
  ]

  const galleryWorks = liveWorks.length ? liveWorks : sampleWorks
  const filteredWorks = galleryWorks.filter((work) => {
    if (activeFilter === 'all') {
      return true
    }

    return work.track === activeFilter
  })
  const fallbackDetail = currentPage.page === 'detail'
    ? sampleWorks.find((work) => work.id === currentPage.workId) ?? null
    : null
  const currentDetail = detailWork ?? fallbackDetail

  return (
    <main className="page-shell">
      {notice ? (
        <div className="notice-banner" role="status">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice('')} aria-label="关闭提示">
            关闭
          </button>
        </div>
      ) : null}

      {currentPage.page === 'home' ? (
        <>
          <section className="hero-section" id="home">
            <div className="hero-grid">
              <div className="hero-copy">
                <div className="hero-kicker">
                  <p className="eyebrow">首届赛事</p>
                </div>
                <h1>首届刀盾杯・大学生赛博整活大赛</h1>
                <p className="slogan">代码可以乱，整活必须癫</p>
                <p className="hero-text">
                  我们主打形式多样，你想到的/想做的都可以，可抽象、可趣味、可脑洞、可酷拽，创意全由你做主。
                </p>
                <div className="hero-actions">
                  <a className="primary-button" href={registrationUrl} target="_blank" rel="noreferrer">
                    立即报名
                  </a>
                  <a className="ghost-button" href="#/gallery">
                    作品广场
                  </a>
                </div>
              </div>

              <aside className="hero-panel" aria-label="报名信息">
                <div className="countdown-header">
                  <span>报名截止倒计时</span>
                </div>
                <div className="countdown-grid" aria-label="报名截止倒计时数值">
                  {countdownItems.map((item) => (
                    <div className="countdown-item" key={item.label}>
                      <strong>{String(item.value).padStart(2, '0')}</strong>
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
                <div className="group-panel">
                  <p className="group-title">官方群</p>
                  <img className="group-qr" src={groupQrCode} alt="刀盾杯官方群二维码" />
                  <p className="group-caption">微信扫码进群获取最新通知</p>
                </div>
              </aside>
            </div>
          </section>

          <section className="announcement-strip" aria-label="赛事亮点">
            {highlights.map((item) => (
              <p key={item}>{item}</p>
            ))}
          </section>

          <section className="info-section" aria-labelledby="about-title">
            <div className="section-heading">
              <p className="eyebrow">比赛说明</p>
              <h2 id="about-title">这比赛干嘛的？</h2>
            </div>
            <div className="info-card">
              <p>
                这是一个面向大学生的赛博整活大赛。你可以把各种想法做成网页、小游戏、应用、小程序、AI 生成视频等，或者只是一个好玩的想法。
              </p>
            </div>
          </section>

          <section className="tracks-section" aria-labelledby="tracks-title">
            <div className="tracks-heading">
              <p className="eyebrow">参赛说明</p>
              <h2 id="tracks-title">两个赛道，任选其一（两个都来就更好了）</h2>
            </div>
            <div className="tracks-grid">
              {tracks.map((track) => (
                <article className="track-card" key={track.title}>
                  <h3>{track.title}</h3>
                  <p>{track.description}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="info-section" aria-labelledby="formats-title">
            <div className="section-heading">
              <p className="eyebrow">提交形式</p>
              <h2 id="formats-title">你可以交这些东西（有其他形式的也可以）</h2>
            </div>
            <div className="format-grid">
              {submissionFormats.map((item) => (
                <div className="format-chip" key={item}>
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section className="examples-section" aria-labelledby="examples-title">
            <div className="section-heading">
              <p className="eyebrow">灵感参考</p>
              <h2 id="examples-title">举几个🌰</h2>
            </div>
            <div className="examples-grid">
              <article className="example-card">
                <h3>有具体东西的赛道</h3>
                <ul>
                  {examples.made.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
              <article className="example-card">
                <h3>纯想法赛道</h3>
                <ul>
                  {examples.idea.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            </div>
          </section>

          <section className="info-section" aria-labelledby="judging-title">
            <div className="section-heading">
              <p className="eyebrow">评选方式</p>
              <h2 id="judging-title">咋评的？</h2>
            </div>
            <div className="info-card">
              <p>本次比赛以大众投票为主。</p>
              <p>大家把票投给自己觉得好玩的作品。</p>
            </div>
          </section>

          <section className="prizes-section" aria-labelledby="prizes-title">
            <div className="section-heading">
              <p className="eyebrow">奖品</p>
              <h2 id="prizes-title">奖金设置与部分奖品参考</h2>
            </div>
            <div className="prize-card">
              <div className="prize-copy">
                <p>落地赛道：500 元 × 1，300 元 × 1，100 元 × 4</p>
                <p>纯想法赛道：50 元 × 1，30 元 × 2，10 元 × 4</p>
                <p>两个赛道均额外加 10 个抽象玩偶</p>
                <p>下图为部分抽象玩偶参考</p>
              </div>
              <img className="prize-image" src={prizePreview} alt="刀盾杯部分抽象玩偶参考" />
            </div>
          </section>
        </>
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
              <div className="detail-info">
                <div>
                  <span className="detail-label">作者</span>
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

      {currentPage.page === 'my' ? (
        loading.my && myWorks.length === 0 ? (
          <section className="form-page">
            <article className="detail-card form-card">
              <p className="form-copy">正在加载你的作品...</p>
            </article>
          </section>
        ) : (
          <MyWorksPage works={myWorks} />
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

      <footer className="site-footer" aria-label="页脚">
        <p>© 2026 QIANLIAI. All rights reserved.</p>
        <p>展示每一个好玩的想法</p>
        {loading.me ? null : me ? <p>当前已登录：{me.email}</p> : null}
      </footer>
    </main>
  )
}

export default App
