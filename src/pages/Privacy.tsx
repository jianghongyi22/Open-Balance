import { Card, Typography, Alert, Descriptions } from 'antd'
import { useI18n } from '../i18n'
import { LockOutlined, SafetyCertificateOutlined } from '@ant-design/icons'

const { Title, Paragraph } = Typography

export default function Privacy() {
  const { t, locale } = useI18n()
  return (
    <div>
      <Title level={4}>{t('privacy.title')}</Title>

      <Alert
        type="success"
        showIcon
        icon={<LockOutlined />}
        message={t('privacy.banner')}
        style={{ marginBottom: 16 }}
      />

      <Card title={t('privacy.flow')} style={{ marginBottom: 16 }}>
        <Paragraph style={{ fontSize: 14 }}>
          <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: 13 }}>
{locale === 'en' ? `Your input (assets / liabilities / profile)
        │
        ▼
Browser localStorage (local persistence)
        │
        ▼
Diagnostic engine (pure computation in the browser)
        │
        ▼
Diagnostic report (rendered in the browser)

—— No data ever leaves your device ——` : `你的输入（资产/负债/家庭档案）
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

      <Card title={t('privacy.storage')} style={{ marginBottom: 16 }}>
        <Descriptions column={1} size="small">
          <Descriptions.Item label={t('privacy.storage.medium')}>
            {t('privacy.storage.mediumValue')}
          </Descriptions.Item>
          <Descriptions.Item label={t('privacy.storage.files')}>
            {t('privacy.storage.filesValue')}
          </Descriptions.Item>
          <Descriptions.Item label={t('privacy.storage.network')}>
            {t('privacy.storage.networkValue')}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title={t('privacy.delete')} style={{ marginBottom: 16 }}>
        <Paragraph>
          {t('privacy.delete.p1')}
        </Paragraph>
        <Paragraph>
          {t('privacy.delete.p2')}
        </Paragraph>
        <Paragraph type="secondary">
          {t('privacy.delete.hint')}
        </Paragraph>
      </Card>

      <Card title={t('privacy.backup')}>
        <Paragraph>
          <SafetyCertificateOutlined style={{ color: '#1E5EFF', marginRight: 8 }} />
          {t('privacy.backup.text')}
        </Paragraph>
      </Card>
    </div>
  )
}
