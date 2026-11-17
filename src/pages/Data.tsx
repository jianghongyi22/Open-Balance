import { useState, useEffect } from 'react'
import {
  Card, Typography, Button, Space, Modal, message, Descriptions, Alert, Row, Col, Tag,
} from 'antd'
import {
  DownloadOutlined, ImportOutlined, DeleteOutlined,
  ExclamationCircleOutlined, FileTextOutlined, FileExcelOutlined,
} from '@ant-design/icons'
import { useStore, wasStorageRecovered } from '../store'
import { useI18n } from '../i18n'
import { useNavigate } from 'react-router-dom'
import { formatCNY } from '../utils/format'
import ImportModal from '../components/ImportModal'

const { Title, Text, Paragraph } = Typography

export default function DataManagement() {
  const { assets, liabilities, profile, exportData, clearAllData, loadSampleData } = useStore()
  const { t } = useI18n()
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const navigate = useNavigate()

  // 本地存储损坏恢复提示（会话级标志，挂载时提示一次）
  const recovered = wasStorageRecovered()
  useEffect(() => {
    if (recovered) {
      message.warning(t('data.recovered.toast'))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recovered])

  const handleExport = () => {
    const data = exportData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `open-balance-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    message.success(t('data.exported'))
  }

  const handleClear = () => {
    clearAllData()
    setDeleteModalOpen(false)
    message.success(t('data.cleared'))
    // HashRouter: 直接刷新首页路径，由 App 的重定向逻辑带回引导页
    setTimeout(() => window.location.href = '#/', 500)
  }

  const totalAssetValue = assets.reduce((s, a) => s + a.marketValue, 0)
  const totalLiabilityValue = liabilities.reduce((s, l) => s + l.remainingPrincipal, 0)

  return (
    <div>
      <Title level={4}>{t('data.title')}</Title>

      <Row gutter={[16, 16]}>
        {recovered && (
          <Col span={24}>
            <Alert
              type="warning"
              showIcon
              message={t('data.recovered.title')}
              description={t('data.recovered.desc')}
            />
          </Col>
        )}

        {/* Summary */}
        <Col span={24}>
          <Card title={t('data.overview')}>
            <Descriptions column={3} size="small">
              <Descriptions.Item label={t('data.assetCount')}>{assets.length} {t('assets.stat.countSuffix')}</Descriptions.Item>
              <Descriptions.Item label={t('data.assetValue')}>{formatCNY(totalAssetValue)}</Descriptions.Item>
              <Descriptions.Item label={t('data.liabilityCount')}>{liabilities.length} {t('assets.stat.countSuffix')}</Descriptions.Item>
              <Descriptions.Item label={t('data.liabilityValue')}>{formatCNY(totalLiabilityValue)}</Descriptions.Item>
              <Descriptions.Item label={t('data.netWorth')}>{formatCNY(totalAssetValue - totalLiabilityValue)}</Descriptions.Item>
              <Descriptions.Item label={t('data.profile')}>{profile ? t('data.profileValue', { n: profile.memberAges.length, income: formatCNY(profile.annualIncome) }) : t('data.profileUnset')}</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        {/* Multi-format Import */}
        <Col xs={24} md={8}>
          <Card>
            <Space direction="vertical" style={{ width: '100%' }}>
              <ImportOutlined style={{ fontSize: 32, color: '#1E5EFF' }} />
              <Title level={5}>{t('data.import')}</Title>
              <Paragraph type="secondary">
                {t('data.importDesc')}
              </Paragraph>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button type="primary" icon={<ImportOutlined />} onClick={() => setImportModalOpen(true)} block>
                  {t('data.importButton')}
                </Button>
                <Space size={4} wrap>
                  <Tag>JSON</Tag><Tag>CSV</Tag><Tag>Excel</Tag>
                  <Tag>微信账单</Tag><Tag>支付宝</Tag><Tag>随手记</Tag><Tag>银行流水</Tag>
                </Space>
              </Space>
            </Space>
          </Card>
        </Col>

        {/* Export */}
        <Col xs={24} md={8}>
          <Card>
            <Space direction="vertical" style={{ width: '100%' }}>
              <FileTextOutlined style={{ fontSize: 32, color: '#1E5EFF' }} />
              <Title level={5}>{t('data.export')}</Title>
              <Paragraph type="secondary">
                {t('data.exportDesc')}
              </Paragraph>
              <Button icon={<DownloadOutlined />} onClick={handleExport} block>
                {t('data.exportButton')}
              </Button>
            </Space>
          </Card>
        </Col>

        {/* Sample / Reset */}
        <Col xs={24} md={8}>
          <Card>
            <Space direction="vertical" style={{ width: '100%' }}>
              <ExclamationCircleOutlined style={{ fontSize: 32, color: '#ff4d4f' }} />
              <Title level={5}>{t('data.operations')}</Title>
              <Paragraph type="secondary">
                {t('data.operationsDesc')}
              </Paragraph>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button onClick={loadSampleData} block>
                  {t('data.loadSample')}
                </Button>
                <Button danger icon={<DeleteOutlined />} onClick={() => setDeleteModalOpen(true)} block>
                  {t('data.clearAll')}
                </Button>
              </Space>
            </Space>
          </Card>
        </Col>

        {/* Supported formats info */}
        <Col span={24}>
          <Card title={t('data.formats')}>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={8}>
                <Card size="small" type="inner">
                  <Space>
                    <FileTextOutlined style={{ color: '#1E5EFF' }} />
                    <Text strong>Open-Balance 备份</Text>
                  </Space>
                  <Paragraph type="secondary" style={{ marginTop: 4, fontSize: 12, marginBottom: 0 }}>
                    {t('data.format.json')}
                  </Paragraph>
                </Card>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Card size="small" type="inner">
                  <Space>
                    <FileExcelOutlined style={{ color: '#52c41a' }} />
                    <Text strong>微信支付账单</Text>
                  </Space>
                  <Paragraph type="secondary" style={{ marginTop: 4, fontSize: 12, marginBottom: 0 }}>
                    {t('data.format.wechat')}
                  </Paragraph>
                </Card>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Card size="small" type="inner">
                  <Space>
                    <FileExcelOutlined style={{ color: '#1677ff' }} />
                    <Text strong>支付宝账单</Text>
                  </Space>
                  <Paragraph type="secondary" style={{ marginTop: 4, fontSize: 12, marginBottom: 0 }}>
                    {t('data.format.alipay')}
                  </Paragraph>
                </Card>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Card size="small" type="inner">
                  <Space>
                    <FileExcelOutlined style={{ color: '#faad14' }} />
                    <Text strong>随手记</Text>
                  </Space>
                  <Paragraph type="secondary" style={{ marginTop: 4, fontSize: 12, marginBottom: 0 }}>
                    {t('data.format.suishouji')}
                  </Paragraph>
                </Card>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Card size="small" type="inner">
                  <Space>
                    <FileExcelOutlined style={{ color: '#ff4d4f' }} />
                    <Text strong>银行流水</Text>
                  </Space>
                  <Paragraph type="secondary" style={{ marginTop: 4, fontSize: 12, marginBottom: 0 }}>
                    .csv/.xls 招商/工商等银行网银导出
                  </Paragraph>
                </Card>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Card size="small" type="inner">
                  <Space>
                    <FileExcelOutlined style={{ color: '#999' }} />
                    <Text strong>通用 CSV/Excel</Text>
                  </Space>
                  <Paragraph type="secondary" style={{ marginTop: 4, fontSize: 12, marginBottom: 0 }}>
                    {t('data.format.generic')}
                  </Paragraph>
                </Card>
              </Col>
            </Row>
          </Card>
        </Col>

        {/* Disclaimer */}
        <Col span={24}>
          <Card>
            <Alert
              type="warning"
              message={t('data.storage')}
              description={
                <div>
                  <Paragraph style={{ marginBottom: 8 }}>
                    {t('data.storage.desc')}
                  </Paragraph>
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    <li>{t('data.storage.b1')}</li>
                    <li>{t('data.storage.b2')}</li>
                    <li>{t('data.storage.b3')}</li>
                    <li>{t('data.storage.b4')}</li>
                    <li>{t('data.storage.b5')}</li>
                    <li>{t('data.storage.b6')} <Button type="link" size="small" style={{ padding: 0 }} onClick={() => navigate('/privacy')}>{t('menu.privacy')} →</Button></li>
                  </ul>
                </div>
              }
            />
          </Card>
        </Col>
      </Row>

      {/* Import Modal */}
      <ImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        title={t('data.clear.title')}
        open={deleteModalOpen}
        onOk={handleClear}
        onCancel={() => setDeleteModalOpen(false)}
        okText={t('data.clear.ok')}
        cancelText={t('data.clear.cancel')}
        okButtonProps={{ danger: true }}
      >
        <Paragraph>
          {t('data.clear.desc')}
        </Paragraph>
        <Paragraph strong>{t('data.clear.hint')}</Paragraph>
      </Modal>
    </div>
  )
}
