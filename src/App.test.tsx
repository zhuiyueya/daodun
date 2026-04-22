import { render, screen } from '@testing-library/react'

import App from './App'

describe('App', () => {
  it('renders the home page by default', () => {
    window.location.hash = '#/'
    render(<App />)

    expect(
      screen.getByRole('heading', {
        name: '首届刀盾杯・大学生赛博整活大赛',
        level: 1,
      }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('报名截止倒计时数值')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: '这比赛干嘛的？', level: 2 }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: '奖金设置与部分奖品参考', level: 2 }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: '咋评的？', level: 2 }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '作品广场' })).toBeInTheDocument()
  })

  it('renders the gallery page from hash route', () => {
    window.location.hash = '#/gallery'
    render(<App />)

    expect(screen.getByRole('tablist', { name: '作品赛道筛选' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '全部' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '落地作品' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '纯想法' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '返回首页' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '登录' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '提交作品' })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: '校园逃课模拟器，踩线混到刚刚好。', level: 3 }),
    ).toBeInTheDocument()
    expect(screen.getByText('找你妹（嘉豪版）')).toBeInTheDocument()
    expect(screen.queryByAltText('找你妹（嘉豪版） 封面图')).not.toBeInTheDocument()
  })

  it('renders the new class skipper mock work detail page', () => {
    window.location.hash = '#/work/work-0'
    render(<App />)

    expect(
      screen.getByRole('heading', { name: '校园逃课模拟器，踩线混到刚刚好。', level: 1 }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', {
        name: 'https://lithiumcitrate.github.io/Class-Skipper-Simulator/',
      }),
    ).toHaveAttribute(
      'href',
      'https://lithiumcitrate.github.io/Class-Skipper-Simulator/',
    )
    expect(screen.getByAltText('校园逃课模拟器，踩线混到刚刚好。 截图 1')).toBeInTheDocument()
  })

  it('renders the work detail page from hash route', () => {
    window.location.hash = '#/work/work-1'
    render(<App />)

    expect(
      screen.getByRole('heading', { name: '找你妹（嘉豪版）', level: 1 }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '返回作品广场' })).toBeInTheDocument()
    expect(screen.getByText('嘉豪宇宙工作室')).toBeInTheDocument()
    expect(screen.queryByAltText('找你妹（嘉豪版） 展示图')).not.toBeInTheDocument()
  })

  it('links the registration button to the Feishu form', () => {
    window.location.hash = '#/'
    render(<App />)

    const registerLinks = screen.getAllByRole('link', {
      name: /立即报名/,
    })

    for (const link of registerLinks) {
      expect(link).toHaveAttribute(
        'href',
        'https://wcnahf1otvjt.feishu.cn/share/base/form/shrcntGTeoraX4xm3Tb4OwKmiLd',
      )
      expect(link).toHaveAttribute('target', '_blank')
    }
  })
})
