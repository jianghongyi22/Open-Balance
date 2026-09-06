import React from 'react'
import { Buffer } from 'buffer'

// exceljs 需要 Node Buffer API；浏览器环境提供 polyfill
;(globalThis as unknown as { Buffer?: unknown }).Buffer =
  (globalThis as unknown as { Buffer?: unknown }).Buffer ?? Buffer
import ReactDOM from 'react-dom/client'
// HashRouter: 支持 GitHub Pages 等静态托管（无服务端路由重写，hash 路由刷新不 404）
import { HashRouter } from 'react-router-dom'
import { ConfigProvider, App as AntApp } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import App from './App'

const theme = {
  token: {
    colorPrimary: '#1E5EFF',
    colorWarning: '#FF7A29',
    borderRadius: 6,
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'PingFang SC', 'Microsoft YaHei', sans-serif",
  },
}

ReactDOM.createRoot(document.getElementById('app')!).render(
  <React.StrictMode>
    <ConfigProvider locale={zhCN} theme={theme}>
      <AntApp>
        <HashRouter>
          <App />
        </HashRouter>
      </AntApp>
    </ConfigProvider>
  </React.StrictMode>
)
