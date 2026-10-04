import { Card, Typography, Alert, Descriptions } from 'antd'
import { LockOutlined, SafetyCertificateOutlined } from '@ant-design/icons'

const { Title, Paragraph, Text } = Typography

export default function Privacy() {
  return (
    <div>
      <Title level={4}>隐私说明</Title>

      <Alert
        type="success"
        showIcon
        icon={<LockOutlined />}
        message="核心承诺：零后端，所有数据只存在于你的浏览器中"
        style={{ marginBottom: 16 }}
      />

      <Card title="数据流（完整过程）" style={{ marginBottom: 16 }}>
        <Paragraph style={{ fontSize: 14 }}>
          <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: 13 }}>
{`你的输入（资产/负债/家庭档案）
        │
        ▼
浏览器 localStorage（本地持久化）
        │
        ▼
诊断引擎（浏览器内纯函数计算）
        │
        ▼
诊断报告（浏览器内渲染）

—— 全程没有任何数据离开你的设备 ——`}
          </pre>
        </Paragraph>
      </Card>

      <Card title="数据存放位置" style={{ marginBottom: 16 }}>
        <Descriptions column={1} size="small">
          <Descriptions.Item label="存储介质">
            浏览器 localStorage（键名 open-balance-store），仅限当前设备当前浏览器
          </Descriptions.Item>
          <Descriptions.Item label="账单文件">
            导入的微信/支付宝/银行账单仅在前端解析，解析结果转为资产条目后文件本身不保存
          </Descriptions.Item>
          <Descriptions.Item label="网络请求">
            应用不包含任何数据上报/统计/追踪代码，账单解析过程零网络请求
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="如何删除数据" style={{ marginBottom: 16 }}>
        <Paragraph>
          1. <Text strong>数据管理 → 清除所有数据</Text>：一键清空资产、负债与家庭档案
        </Paragraph>
        <Paragraph>
          2. 或直接清除浏览器站点数据（浏览器设置 → 隐私 → 站点数据 → 删除本站）
        </Paragraph>
        <Paragraph type="secondary">
          提示：清除前建议先在数据管理页导出 JSON 备份。
        </Paragraph>
      </Card>

      <Card title="备份建议">
        <Paragraph>
          <SafetyCertificateOutlined style={{ color: '#1E5EFF', marginRight: 8 }} />
          数据仅存本地意味着：换设备/清缓存会丢失数据。建议定期使用「数据管理 →
          导出 JSON」备份，备份文件由你自己保管。
        </Paragraph>
      </Card>
    </div>
  )
}
