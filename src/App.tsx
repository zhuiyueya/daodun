import { useEffect, useState } from 'react'

import './App.css'
import prizePreview from './assets/5FC9B1BF14E3034F2CD2E29B48605F13.jpg'
import groupQrCode from './assets/qrcode.jpg'
import classSkipperCover from './assets/taokemoniqi/d5fce296660ee7b23435c13845e5d9e0.png'
import classSkipperShot1 from './assets/taokemoniqi/7fd52f3db8bd5a4fb5b89f3904234ed8.png'
import classSkipperShot2 from './assets/taokemoniqi/ae4d243fd2bdd58b8de58778e4d53a55.png'
import jiahaoCover from './assets/jiahaoTI/08cb2901168867e34c1175d07059bad1.png'
import jiahaoShot from './assets/jiahaoTI/c4c46ffb34b0d596df2047a9fd72e18a.png'
import dahunzhanCover from './assets/dahunzhan/547220cbe4244041e1d435ee97695185.png'
import dahunzhanImage from './assets/dahunzhan/6BB3AB439C86A8F9D183E4966B4363F4.jpg'

const registrationUrl =
  'https://wcnahf1otvjt.feishu.cn/share/base/form/shrcntGTeoraX4xm3Tb4OwKmiLd'

const deadline = new Date('2026-05-07T00:00:00+08:00')

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
    description:
      '适合脑洞先行的人。可以用文字、图片等方式，把你的想法讲清楚。',
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
    '刀盾大战奶龙 AI 生成视频'
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

const works = [
  {
    id: 'work-0',
    track: 'landing',
    title: '校园逃课模拟器，踩线混到刚刚好。',
    summary: '一个把“逃课踩点”做成网页体验的模拟器，主打在边缘反复横跳。',
    media: ['网站', '截图'],
    status: '可直接访问',
    author: '䑟譱',
    cover: classSkipperCover,
    website: 'https://lithiumcitrate.github.io/Class-Skipper-Simulator/',
    description: '校园逃课模拟器，踩线混到刚刚好。',
    deliverables: [
      '可直接访问的网站链接',
      '作品封面图 1 张',
      '玩法截图 2 张',
      '文字说明与模拟设定',
    ],
    assets: [
      { type: 'image', src: classSkipperShot1 },
      { type: 'image', src: classSkipperShot2 },
    ],
  },
  {
    id: 'work-1',
    track: 'idea',
    title: '找你妹（嘉豪版）',
    summary: '一个一边找茬一边怀疑自己是不是嘉豪的离谱小游戏。',
    media: ['网站', '截图'],
    status: '可直接访问',
    author: '嘉豪宇宙工作室',
    description:
      '把找你妹和嘉豪梗强行缝合在一起做网页版小游戏。玩家需要在满屏抽象素材里迅速找出唯一合理答案',
    deliverables: [
      '可直接访问的网站链接',
      '3 张关键界面截图',
      '一段 30 秒玩法演示视频',
    ],
  },
  {
    id: 'work-2',
    track: 'landing',
    title: '咕咕嘎嘎,刘强卖瓜,刀盾,哈基米大混战',
    summary: '豆包理解的...,这啥啊',
    media: ['视频', '截图'],
    status: '视频作品',
    author: '刀盾',
    cover: dahunzhanCover,
    website:
      '6.97 复制打开抖音，看看【名字30天内已修改0次的作品】豆包理解的咕咕嘎嘎和刀盾，哈基米… 太抽象了 br... https://v.douyin.com/UNaqpqQ4jYA/ S@y.Ty xfo:/ 04/06',
    description: '豆包理解的...,这啥啊',
    deliverables: [
      '1080p 视频成片',
      '视频分镜截图',
      'AI 提示词与制作说明',
    ],
    assets: [{ type: 'image', src: dahunzhanImage }],
  },
  {
    id: 'work-3',
    track: 'landing',
    title: '嘉豪指数测试',
    summary: '是不是嘉豪一测就知',
    media: ['网站', '截图'],
    status: '可直接访问',
    author: '匿名',
    cover: jiahaoCover,
    website: 'https://jiahaoti.pages.dev/',
    description: '是不是嘉豪一测就知',
    deliverables: [
      '交互网页链接',
      '结果页截图',
      '题库与判定逻辑说明',
    ],
    assets: [
      { type: 'image', src: jiahaoCover },
      { type: 'image', src: jiahaoShot },
    ],
  },
  {
    id: 'work-4',
    track: 'idea',
    title: '带薪拉屎模拟器',
    summary: '通过时间、姿势和老板视角，精确计算每次摸鱼带来的真实收益。',
    media: ['文字', '配图'],
    status: '纯想法',
    author: '厕所经济学派',
    description:
      '统计自己在上班期间拉了多少次屎，每次拉屎的时间是多少，然后按每日的工资来计算出自己今天赚了多少钱，毕竟摸来的才是赚到的。',
    deliverables: ['核心玩法说明文档', '2 张概念配图', '奖励与失败机制设想'],
  },
  {
    id: 'work-6',
    track: 'idea',
    title: '会安慰人的课表精灵',
    summary: '一款在你早八崩溃前，先用可爱语音替你骂课表的抽象校园助手。',
    media: ['文字', '配图'],
    status: '概念作品',
    author: '早八受害者联盟',
    description:
      '它表面是一个课表助手，实际上是一个情绪陪伴精灵，会在你看到连堂和早八时先替你骂出声，再给出可爱但无用的安慰。',
    deliverables: ['产品概念说明', '交互流程草图', '情绪语音脚本片段'],
  },
] as const

function getCurrentPage() {
  const hash = window.location.hash || '#/'

  if (hash.startsWith('#/work/')) {
    return {
      page: 'detail' as const,
      workId: hash.replace('#/work/', ''),
    }
  }

  if (hash === '#/gallery') {
    return { page: 'gallery' as const, workId: null }
  }

  return { page: 'home' as const, workId: null }
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

function getExternalHref(text: string) {
  const matchedUrl = text.match(/https?:\/\/\S+/)

  return matchedUrl?.[0] ?? text
}

function App() {
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(Date.now()))
  const [currentPage, setCurrentPage] = useState(() => getCurrentPage())
  const [activeFilter, setActiveFilter] =
    useState<(typeof galleryFilters)[number]['key']>('all')
  const [notice, setNotice] = useState('')

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

  const countdownItems = [
    { label: '天', value: timeLeft.days },
    { label: '时', value: timeLeft.hours },
    { label: '分', value: timeLeft.minutes },
    { label: '秒', value: timeLeft.seconds },
  ]

  const filteredWorks = works.filter((work) => {
    if (activeFilter === 'all') {
      return true
    }

    return work.track === activeFilter
  })

  const showComingSoonNotice = (feature: string) => {
    setNotice(`${feature}将在比赛正式开始后开放，先来看看作品广场和比赛说明。`)
  }

  const copyText = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setNotice('链接已复制')
    } catch {
      setNotice('复制失败，请手动复制')
    }
  }

  const detailWork = works.find((work) => work.id === currentPage.workId) ?? null

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
                  <a className="secondary-link kicker-link" href="#/gallery">
                    作品广场
                  </a>
                </div>
                <h1>首届刀盾杯・大学生赛博整活大赛</h1>
                <p className="slogan">代码可以乱，整活必须癫</p>
                <p className="hero-text">
                  我们主打形式多样，你想到的/想做的都可以，可抽象、可趣味、可脑洞、可酷拽，创意全由你做主。
                </p>
                <div className="hero-actions">
                  <a
                    className="primary-button"
                    href={registrationUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    立即报名
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
              <p>大家把票投给自己觉得好玩的作品</p>
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
      ) : currentPage.page === 'gallery' ? (
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
            <div className="gallery-actions">
              <button
                className="ghost-button"
                type="button"
                onClick={() => showComingSoonNotice('邮箱登录')}
              >
                登录
              </button>
              <button
                className="ghost-button"
                type="button"
                onClick={() => showComingSoonNotice('提交作品')}
              >
                提交作品
              </button>
            </div>
          </div>
          <div className="works-grid">
            {filteredWorks.map((work) => (
              <article className="work-card" key={work.id}>
                {'cover' in work ? (
                  <img className="work-cover" src={work.cover} alt={`${work.title} 封面图`} />
                ) : null}
                <h3>{work.title}</h3>
                <p>{getGalleryDescription(work.description)}</p>
                <a className="card-button" href={`#/work/${work.id}`}>
                  查看详情
                </a>
              </article>
            ))}
          </div>
        </section>
      ) : detailWork ? (
        <section className="detail-page" aria-labelledby="detail-title">
          <div className="detail-toolbar">
            <a className="secondary-link back-link" href="#/gallery">
              返回作品广场
            </a>
            <div className="gallery-actions">
              <button
                className="ghost-button"
                type="button"
                onClick={() => showComingSoonNotice('邮箱登录')}
              >
                登录
              </button>
              <button
                className="ghost-button"
                type="button"
                onClick={() => showComingSoonNotice('提交作品')}
              >
                提交作品
              </button>
            </div>
          </div>
          <article className="detail-card">
            {'cover' in detailWork ? (
              <img
                className="detail-cover"
                src={detailWork.cover}
                alt={`${detailWork.title} 展示图`}
              />
            ) : null}
            <h1 id="detail-title">{detailWork.title}</h1>
            <div className="detail-info">
              <div>
                <span className="detail-label">作者</span>
                <p>{detailWork.author}</p>
              </div>
              {'website' in detailWork ? (
                <div>
                  <span className="detail-label">可访问网址</span>
                  <div className="detail-link-row">
                    <a
                      className="detail-link"
                      href={getExternalHref(detailWork.website)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {detailWork.website}
                    </a>
                    <button
                      className="copy-button"
                      type="button"
                      onClick={() => copyText(detailWork.website)}
                    >
                      复制
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="detail-block">
              <h2>作品说明</h2>
              <p>{detailWork.description}</p>
            </div>
            {'assets' in detailWork ? (
              <div className="detail-block">
                <h2>作品截图/视频</h2>
                <div className="detail-gallery">
                  {detailWork.assets.map((item, index) => (
                    <img
                      key={item.src}
                      className="detail-gallery-media"
                      src={item.src}
                      alt={`${detailWork.title} 截图 ${index + 1}`}
                    />
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
            <p>这个作品链接目前没有对应的 mock 数据，先返回作品广场看看别的。</p>
            <a className="primary-button" href="#/gallery">
              返回作品广场
            </a>
          </div>
        </section>
      )}

      <footer className="site-footer" aria-label="页脚">
        <p>© 2026 QIANLIAI. All rights reserved.</p>
        <p>展示每一个好玩的想法</p>
      </footer>
    </main>
  )
}

export default App
