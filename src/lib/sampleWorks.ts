import classSkipperCover from '../assets/taokemoniqi/d5fce296660ee7b23435c13845e5d9e0.png'
import classSkipperShot1 from '../assets/taokemoniqi/7fd52f3db8bd5a4fb5b89f3904234ed8.png'
import classSkipperShot2 from '../assets/taokemoniqi/ae4d243fd2bdd58b8de58778e4d53a55.png'
import dahunzhanCover from '../assets/dahunzhan/547220cbe4244041e1d435ee97695185.png'
import dahunzhanImage from '../assets/dahunzhan/6BB3AB439C86A8F9D183E4966B4363F4.jpg'
import jiahaoCover from '../assets/jiahaoTI/08cb2901168867e34c1175d07059bad1.png'
import jiahaoShot from '../assets/jiahaoTI/c4c46ffb34b0d596df2047a9fd72e18a.png'
import type { PublicWork } from '../types'

export const sampleWorks: PublicWork[] = [
  {
    id: 'sample-work-0',
    track: 'landing',
    title: '校园逃课模拟器，踩线混到刚刚好。',
    description: '校园逃课模拟器，踩线混到刚刚好。',
    authorName: '䑟譱',
    externalUrl: 'https://lithiumcitrate.github.io/Class-Skipper-Simulator/',
    platformType: 'website',
    coverImageUrl: classSkipperCover,
    imageUrls: [classSkipperShot1, classSkipperShot2],
    createdAt: '2026-04-20T00:00:00+08:00',
    source: 'sample',
  },
  {
    id: 'sample-work-1',
    track: 'idea',
    title: '找你妹（嘉豪版）',
    description:
      '把找你妹和嘉豪梗强行缝合在一起做网页版小游戏。玩家需要在满屏抽象素材里迅速找出唯一合理答案',
    authorName: '嘉豪宇宙工作室',
    externalUrl: null,
    platformType: 'none',
    coverImageUrl: null,
    imageUrls: [],
    createdAt: '2026-04-20T00:00:00+08:00',
    source: 'sample',
  },
  {
    id: 'sample-work-2',
    track: 'landing',
    title: '咕咕嘎嘎,刘强卖瓜,刀盾,哈基米大混战',
    description: '豆包理解的...,这啥啊',
    authorName: '刀盾',
    externalUrl:
      '6.97 复制打开抖音，看看【名字30天内已修改0次的作品】豆包理解的咕咕嘎嘎和刀盾，哈基米… 太抽象了 br... https://v.douyin.com/UNaqpqQ4jYA/ S@y.Ty xfo:/ 04/06',
    platformType: 'douyin',
    coverImageUrl: dahunzhanCover,
    imageUrls: [dahunzhanImage],
    createdAt: '2026-04-20T00:00:00+08:00',
    source: 'sample',
  },
  {
    id: 'sample-work-3',
    track: 'landing',
    title: '嘉豪指数测试',
    description: '是不是嘉豪一测就知',
    authorName: '匿名',
    externalUrl: 'https://jiahaoti.pages.dev/',
    platformType: 'website',
    coverImageUrl: jiahaoCover,
    imageUrls: [jiahaoCover, jiahaoShot],
    createdAt: '2026-04-20T00:00:00+08:00',
    source: 'sample',
  },
  {
    id: 'sample-work-4',
    track: 'idea',
    title: '带薪拉屎模拟器',
    description:
      '统计自己在上班期间拉了多少次屎，每次拉屎的时间是多少，然后按每日的工资来计算出自己今天赚了多少钱，毕竟摸来的才是赚到的。',
    authorName: '厕所经济学派',
    externalUrl: null,
    platformType: 'none',
    coverImageUrl: null,
    imageUrls: [],
    createdAt: '2026-04-20T00:00:00+08:00',
    source: 'sample',
  },
  {
    id: 'sample-work-6',
    track: 'idea',
    title: '会安慰人的课表精灵',
    description:
      '它表面是一个课表助手，实际上是一个情绪陪伴精灵，会在你看到连堂和早八时先替你骂出声，再给出可爱但无用的安慰。',
    authorName: '早八受害者联盟',
    externalUrl: null,
    platformType: 'none',
    coverImageUrl: null,
    imageUrls: [],
    createdAt: '2026-04-20T00:00:00+08:00',
    source: 'sample',
  },
]
