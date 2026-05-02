# WeChat Sign Service

一个独立的 Node.js 微信 JSSDK 签名服务，用来部署在有固定出口 IP 的服务器上。

## 作用

这个服务只负责一件事：

1. 用 `WECHAT_APP_ID` 和 `WECHAT_APP_SECRET` 获取微信 `access_token`
2. 获取 `jsapi_ticket`
3. 生成前端 `wx.config` 所需签名

## 环境变量

参考 `.env.example`：

```bash
PORT=8789
WECHAT_APP_ID=your_wechat_app_id
WECHAT_APP_SECRET=your_wechat_app_secret
ALLOWED_ORIGINS=https://wodedaodun.pages.dev,http://127.0.0.1:8788
```

## 启动

```bash
cd wechat-sign-service
npm install
npm run start
```

启动后默认监听：

`http://0.0.0.0:8789`

## 接口

### 健康检查

```http
GET /healthz
```

### 获取 JSSDK 签名

```http
POST /wechat/jssdk-sign
Content-Type: application/json

{
  "url": "https://wodedaodun.pages.dev/"
}
```

返回：

```json
{
  "appId": "xxx",
  "timestamp": 1710000000,
  "nonceStr": "xxx",
  "signature": "xxx"
}
```

## 主站对接

推荐对接方式不是让浏览器直接调用这个服务，而是让 Cloudflare Pages Functions 代理转发。

这样有两个好处：

1. 主站页面仍然只访问自己站内的 `/api/wechat/jssdk-sign`
2. 即使这台百度云服务器暂时没有 HTTPS，也不会触发浏览器混合内容限制

主站 Cloudflare 环境变量配置：

```bash
WECHAT_SIGN_SERVICE_URL=http://120.48.154.107:8789/wechat/jssdk-sign
```

配置后，当前仓库里的 `/api/wechat/jssdk-sign` 会自动把请求转发到这台 Node 服务。

如果你后面给百度云服务配了 HTTPS，也可以继续这么用，或者再切成前端直连都可以。

## 部署建议

建议部署在：

- 百度云 ECS
- 有固定出口 IP 的 Node.js 服务
- 有固定出口 IP
- 最好后续再补 HTTPS，但不是这条链路跑通的前置条件

然后把该服务器出口 IP 加到微信开发者平台的 API IP 白名单。
