import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import App from './App'

function jsonResponse(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    ...init,
  })
}

describe('App', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString()

      if (url === '/api/me') {
        return jsonResponse({ user: null })
      }

      if (url === '/api/works?track=all') {
        return jsonResponse({
          works: [
            {
              id: 'live-work-1',
              track: 'landing',
              title: '真实作品',
              description: '这是从 API 里来的真实作品说明',
              authorName: '匿名',
              externalUrl: 'https://example.com',
              platformType: 'website',
              coverImageUrl: 'https://example.com/cover.jpg',
              createdAt: '2026-04-22T00:00:00+08:00',
            },
          ],
        })
      }

      if (url === '/api/works/live-work-1') {
        return jsonResponse({
          work: {
            id: 'live-work-1',
            track: 'landing',
            title: '真实作品',
            description: '这是从 API 里来的真实作品说明',
            authorName: '匿名',
            externalUrl: 'https://example.com',
            platformType: 'website',
            coverImageUrl: 'https://example.com/cover.jpg',
            imageUrls: ['https://example.com/1.jpg'],
            status: 'approved',
            rejectReason: null,
            createdAt: '2026-04-22T00:00:00+08:00',
          },
        })
      }

      if (url === '/api/my/works') {
        return jsonResponse({
          works: [
            {
              id: 'mine-1',
              track: 'idea',
              title: '我的作品',
              description: '等待审核中',
              authorName: '我',
              externalUrl: null,
              platformType: 'none',
              coverImageUrl: null,
              imageUrls: [],
              status: 'pending',
              rejectReason: null,
              createdAt: '2026-04-22T00:00:00+08:00',
            },
          ],
        })
      }

      if (url === '/api/auth/request-code' && init?.method === 'POST') {
        return jsonResponse({ ok: true, message: '验证码已发送' })
      }

      if (url === '/api/auth/verify-code' && init?.method === 'POST') {
        return jsonResponse({
          ok: true,
          user: {
            id: 'user-1',
            email: 'test@example.com',
            isAdmin: false,
          },
        })
      }

      if (url === '/api/auth/logout' && init?.method === 'POST') {
        return jsonResponse({ ok: true })
      }

      return jsonResponse({}, { status: 404 })
    }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the home page by default', async () => {
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
      screen.getByRole('heading', { name: '奖金设置与部分奖品参考', level: 2 }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '作品广场' })).toBeInTheDocument()

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/me', expect.anything())
    })
  })

  it('renders live works on the gallery page', async () => {
    window.location.hash = '#/gallery'
    render(<App />)

    expect(screen.getByRole('tablist', { name: '作品赛道筛选' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '返回首页' })).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '真实作品', level: 3 })).toBeInTheDocument()
    })

    expect(screen.getByText('这是从 API 里来的真实作品说明')).toBeInTheDocument()
  })

  it('renders the live work detail page', async () => {
    window.location.hash = '#/work/live-work-1'
    render(<App />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '真实作品', level: 1 })).toBeInTheDocument()
    })

    expect(screen.getByText('匿名')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '复制' })).toBeInTheDocument()
    expect(screen.getByAltText('真实作品 截图 1')).toBeInTheDocument()
  })

  it('supports email verification login flow', async () => {
    window.location.hash = '#/auth?next=%2Fsubmit'
    render(<App />)

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'test@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: '发送验证码' }))

    await waitFor(() => {
      expect(screen.getByPlaceholderText('输入 6 位验证码')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByPlaceholderText('输入 6 位验证码'), {
      target: { value: '123456' },
    })
    fireEvent.click(screen.getByRole('button', { name: '确认登录' }))

    await waitFor(() => {
      expect(window.location.hash).toBe('#/submit')
    })
  })

  it('loads my works page', async () => {
    window.location.hash = '#/my'
    render(<App />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '提交记录与审核状态', level: 1 })).toBeInTheDocument()
    })

    expect(screen.getByRole('heading', { name: '我的作品', level: 3 })).toBeInTheDocument()
    expect(screen.getByText('待审核')).toBeInTheDocument()
  })
})
