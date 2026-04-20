import { useEffect, useState } from 'react'

import './App.css'
import prizePreview from './assets/5FC9B1BF14E3034F2CD2E29B48605F13.jpg'
import groupQrCode from './assets/qrcode.jpg'

const registrationUrl =
  'https://wcnahf1otvjt.feishu.cn/share/base/form/shrcntGTeoraX4xm3Tb4OwKmiLd'

const deadline = new Date('2026-04-26T00:00:00+08:00')

const highlights = [
  '只要是你想实现的、好玩有趣，沾点 AI / 编程，都能来参赛~',
  '纯想法、纯创意也同样可以，不要求你先把作品做得像个正经产品。',
  '参赛即有机会赢取抽象小礼物 (doge)',
]

const tracks = [
  {
    title: 'Vibe Coding 赛道',
    description:
      '你可以提交一个可访问的网站、Demo 或其他成品；如果暂时没上线，也可以提交视频和截图。',
  },
  {
    title: '纯想法赛道',
    description:
      '适合脑洞先行的人。可以用文字、图片、视频等方式，把你的想法讲清楚。',
  },
]

const submissionFormats = [
  '可直接访问的网站',
  '小游戏 / 小工具 / Demo',
  '作品截图/视频',
  '纯文字描述',
]

const examples = {
  made: [
    '找你妹（嘉豪版）小游戏',
    '刀盾大战奶龙 AI 视频',
    '嘉豪测试网站：测你是不是嘉豪',
    '一个离谱但真的能用的课表软件',
  ],
  idea: [
    '我的想法是可以做一个带薪拉屎模拟器，这样我每天就能知道自己拉屎的时候赚了多了钱了，毕竟摸鱼来的才是赚的',
    '感觉能做一个蓝宝红宝紫宝大混战',
    '可以做一个可以做（bushi）',
  ],
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

function App() {
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(Date.now()))

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTimeLeft(getTimeLeft(Date.now()))
    }, 1000)

    return () => {
      window.clearInterval(timer)
    }
  }, [])

  const countdownItems = [
    { label: '天', value: timeLeft.days },
    { label: '时', value: timeLeft.hours },
    { label: '分', value: timeLeft.minutes },
    { label: '秒', value: timeLeft.seconds },
  ]

  return (
    <main className="page-shell">
      <section className="hero-section">
        <div className="hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">首届赛事</p>
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
            这是一个面向大学生的赛博整活大赛。你可以把各种想法做成网页、小游戏、AI 视频，或者只是一个好玩的想法。
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
          <h2 id="examples-title">举几个例子</h2>
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
          <h2 id="prizes-title">部分奖品预览</h2>
        </div>
        <div className="prize-card">
          <img className="prize-image" src={prizePreview} alt="刀盾杯部分奖品预览" />
        </div>
      </section>

      <footer className="site-footer" aria-label="页脚">
        <p>© 2026 QIANLIAI. All rights reserved.</p>
        <p>展示每一个好玩的想法</p>
      </footer>
    </main>
  )
}

export default App
