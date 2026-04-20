import { render, screen } from '@testing-library/react'

import App from './App'

describe('App', () => {
  it('renders the event title and deadline', () => {
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
      screen.getByRole('heading', { name: '部分奖品预览', level: 2 }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: '咋评的？', level: 2 }),
    ).toBeInTheDocument()
  })

  it('links the registration buttons to the Feishu form', () => {
    render(<App />)

    const registerLinks = screen.getAllByRole('link', {
      name: /立即报名|前往报名表单/,
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
