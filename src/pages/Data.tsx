import { useState, useEffect } from 'react'
import {
  Card, Typography, Button, Space, Modal, message, Descriptions, Alert, Row, Col, Tag,
} from 'antd'
import {
  DownloadOutlined, ImportOutlined, DeleteOutlined,
  ExclamationCircleOutlined, FileTextOutlined, FileExcelOutlined,
} from '@ant-design/icons'
import { useStore, wasStorageRecovered } from '../store'
import { useNavigate } from 'react-router-dom'
import { formatCNY } from '../utils/format'
import ImportModal from '../components/ImportModal'

const { Title, Text, Paragraph } = Typography

export default function DataManagement() {
  const { assets, liabilities, profile, exportData, clearAllData, loadSampleData } = useStore()
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const navigate = useNavigate()

  // 本地存储损坏恢复提示（会话级标志，挂载时提示一次）
  const recovered = wasStorageRecovered()
  useEffect(() => {
    if (recovered) {
      message.warning('检测到本地数据损坏，已备份为 corrupted 键并重置为空数据。建议先导出 JSON 备份。')
    }
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
    message.success('数据已导出')
  }

  const handleClear = () => {
    clearAllData()
    setDeleteModalOpen(false)
    message.success('数据已清除')
    // HashRouter: 直接刷新首页路径，由 App 的重定向逻辑带回引导页
    setTimeout(() => window.location.href = '#/', 500)
  }

  const totalAssetValue = assets.reduce((s, a) => s + a.marketValue, 0)
  const totalLiabilityValue = liabilities.reduce((s, l) => s + l.remainingPrincipal, 0)

  return (
    <div>
      <Title level={4}>数据管理</Title>

      <Row gutter={[16, 16]}>
        {recovered && (
          <Col span={24}>
            <Alert
              type="warning"
              showIcon
              message="本地数据已从损坏状态恢复"
              description="原始损坏数据已备份到 localStorage 的 open-balance-store-corrupted-* 键中，当前数据已重置。"
            />
          </Col>
        )}

        {/* Summary */}
        <Col span={24}>
          <Card title="数据概览">
            <Descriptions column={3} size="small">
              <Descriptions.Item label="资产项数">{assets.length} 项</Descriptions.Item>
              <Descriptions.Item label="资产总值">{formatCNY(totalAssetValue)}</Descriptions.Item>
              <Descriptions.Item label="负债项数">{liabilities.length} 项</Descriptions.Item>
              <Descriptions.Item label="负债总额">{formatCNY(totalLiabilityValue)}</Descriptions.Item>
              <Descriptions.Item label="净资产">{formatCNY(totalAssetValue - totalLiabilityValue)}</Descriptions.Item>
              <Descriptions.Item label="家庭档案">{profile ? `${profile.memberAges.length}位成员 · 年收入${formatCNY(profile.annualIncome)}` : '未设置'}</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        {/* Multi-format Import */}
        <Col xs={24} md={8}>
          <Card>
            <Space direction="vertical" style={{ width: '100%' }}>
              <ImportOutlined style={{ fontSize: 32, color: '#1E5EFF' }} />
              <Title level={5}>导入数据</Title>
              <Paragraph type="secondary">
                支持多种格式：Open-Balance 备份 · 微信账单 · 支付宝账单 · 随手记 · 银行流水 · 通用 CSV/Excel
              </Paragraph>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button type="primary" icon={<ImportOutlined />} onClick={() => setImportModalOpen(true)} block>
                  选择文件导入
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
              <Title level={5}>导出备份 (JSON)</Title>
              <Paragraph type="secondary">
                将所有资产、负债和家庭档案导出为JSON文件，可用于备份或迁移
              </Paragraph>
              <Button icon={<DownloadOutlined />} onClick={handleExport} block>
                导出 JSON
              </Button>
            </Space>
          </Card>
        </Col>

        {/* Sample / Reset */}
        <Col xs={24} md={8}>
          <Card>
            <Space direction="vertical" style={{ width: '100%' }}>
              <ExclamationCircleOutlined style={{ fontSize: 32, color: '#ff4d4f' }} />
              <Title level={5}>数据操作</Title>
              <Paragraph type="secondary">
                重置为示例数据体验功能，或清除所有数据重新开始
              </Paragraph>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button onClick={loadSampleData} block>
                  载入示例数据
                </Button>
                <Button danger icon={<DeleteOutlined />} onClick={() => setDeleteModalOpen(true)} block>
                  清除所有数据
                </Button>
              </Space>
            </Space>
          </Card>
        </Col>

        {/* Supported formats info */}
        <Col span={24}>
          <Card title="支持的导入格式">
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={8}>
                <Card size="small" type="inner">
                  <Space>
                    <FileTextOutlined style={{ color: '#1E5EFF' }} />
                    <Text strong>Open-Balance 备份</Text>
                  </Space>
                  <Paragraph type="secondary" style={{ marginTop: 4, fontSize: 12, marginBottom: 0 }}>
                    .json 格式，含资产+负债+档案（系统自有格式）
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
                    .csv 微信→支付→钱包→账单→导出
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
                    .csv/.xls 支付宝→我的→账单→导出
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
                    .csv/.xls 随手记→更多→导出数据
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
                    任何表格文件，自动匹配列名（兜底方案）
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
              message="数据存储说明"
              description={
                <div>
                  <Paragraph style={{ marginBottom: 8 }}>
                    您的所有数据存储在浏览器的 localStorage 中。这意味着：
                  </Paragraph>
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    <li>数据仅保存在当前设备/浏览器中，不会上传到任何服务器</li>
                    <li>清除浏览器缓存/数据会导致数据丢失</li>
                    <li>不同设备/浏览器之间的数据是独立的</li>
                    <li>建议定期使用"导出 JSON"功能备份数据</li>
                    <li>导入的文件仅在前端解析，不会上传到服务器</li>
                    <li>详细数据流与删除指引见 <Button type="link" size="small" style={{ padding: 0 }} onClick={() => navigate('/privacy')}>隐私说明 →</Button></li>
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
        title="确认清除所有数据？"
        open={deleteModalOpen}
        onOk={handleClear}
        onCancel={() => setDeleteModalOpen(false)}
        okText="确认清除"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <Paragraph>
          此操作将删除所有资产、负债和家庭档案数据，且不可恢复。
        </Paragraph>
        <Paragraph strong>建议在清除前先导出数据备份。</Paragraph>
      </Modal>
    </div>
  )
}
