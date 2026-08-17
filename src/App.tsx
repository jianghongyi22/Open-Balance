import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Typography } from 'antd'
import {
  DashboardOutlined,
  PieChartOutlined,
  FileTextOutlined,
  BulbOutlined,
  ExperimentOutlined,
  DatabaseOutlined,
  HomeOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useStore } from './store'
import Dashboard from './pages/Dashboard'
import Assets from './pages/Assets'
import Report from './pages/Report'
import Recommendations from './pages/Recommendations'
import ScenarioLab from './pages/ScenarioLab'
import DataManagement from './pages/Data'
import Onboarding from './pages/Onboarding'

const { Sider, Content, Header } = Layout
const { Text } = Typography

const menuItems = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '总览' },
  { key: '/assets', icon: <PieChartOutlined />, label: '资产台账' },
  { key: '/report', icon: <FileTextOutlined />, label: '诊断报告' },
  { key: '/recommendations', icon: <BulbOutlined />, label: '优化建议' },
  { key: '/scenario-lab', icon: <ExperimentOutlined />, label: '情景分析' },
  { key: '/data', icon: <DatabaseOutlined />, label: '数据管理' },
]

function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { onboardingComplete, profile } = useStore()

  // Redirect to onboarding if not completed
  if (!onboardingComplete || !profile) {
    if (location.pathname !== '/onboarding') {
      return <Navigate to="/onboarding" replace />
    }
  }

  const selectedKey = menuItems.find((item) =>
    location.pathname.startsWith(item.key)
  )?.key ?? '/dashboard'

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        width={200}
        style={{
          background: '#fff',
          borderRight: '1px solid #f0f0f0',
        }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '1px solid #f0f0f0',
            cursor: 'pointer',
          }}
          onClick={() => navigate('/dashboard')}
        >
          <HomeOutlined style={{ fontSize: 18, color: '#1E5EFF', marginRight: 8 }} />
          <Text strong style={{ fontSize: 16, color: '#1E5EFF' }}>
            Open-Balance
          </Text>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0, marginTop: 8 }}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text type="secondary" style={{ fontSize: 13 }}>
            家庭资产配置诊断 · 财务体检报告
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            免责声明：本工具仅供教育参考，不构成投资建议
          </Text>
        </Header>
        <Content
          style={{
            padding: 24,
            background: '#f5f5f5',
            overflow: 'auto',
          }}
        >
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/assets" element={<Assets />} />
            <Route path="/report" element={<Report />} />
            <Route path="/recommendations" element={<Recommendations />} />
            <Route path="/scenario-lab" element={<ScenarioLab />} />
            <Route path="/data" element={<DataManagement />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/*" element={<AppLayout />} />
    </Routes>
  )
}
