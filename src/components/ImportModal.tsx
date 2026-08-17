import { useState } from 'react'
import {
  Modal, Upload, Steps, Button, Space, Card, Typography, Table, Tag,
  Alert, Result, Descriptions, Divider, message,
} from 'antd'
import {
  InboxOutlined, FileExcelOutlined, FileTextOutlined,
  CheckCircleOutlined, ExclamationCircleOutlined,
} from '@ant-design/icons'
import type { UploadProps } from 'antd'
import { detectAndImport } from '../importer'
import { IMPORT_FORMAT_LABELS } from '../importer'
import type { ImportFormat, ImportResult } from '../importer/types'
import { useStore } from '../store'
import { formatCNY } from '../utils/format'

const { Title, Text, Paragraph } = Typography
const { Dragger } = Upload

interface ImportModalProps {
  open: boolean
  onClose: () => void
}

export default function ImportModal({ open, onClose }: ImportModalProps) {
  const [stage, setStage] = useState<0 | 1 | 2>(0)
  const [format, setFormat] = useState<ImportFormat | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [fileName, setFileName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { importAssets, importLiabilities, setProfile } = useStore()

  const handleFile = async (file: File) => {
    setLoading(true)
    setError(null)
    setFileName(file.name)

    try {
      const { format: fmt, result: res } = await detectAndImport(file)
      setFormat(fmt)
      setResult(res)
      setStage(1)
    } catch (e: any) {
      setError(e.message || '文件解析失败，请尝试其他格式')
    } finally {
      setLoading(false)
    }

    return false // Prevent upload
  }

  const handleConfirm = () => {
    if (!result || result.assets.length === 0) {
      message.warning('没有可导入的资产')
      return
    }

    importAssets(result.assets)

    // Open-Balance backup may also carry liabilities & household profile
    const extras = result.extras as
      | { liabilities?: unknown[]; profile?: unknown }
      | undefined
    if (extras?.liabilities && extras.liabilities.length > 0) {
      importLiabilities(extras.liabilities as never[])
    }
    if (extras?.profile) {
      setProfile(extras.profile as never)
    }

    message.success(`成功导入 ${result.assets.length} 项资产`)

    if (result.warnings.length > 0) {
      setTimeout(() => {
        result.warnings.forEach((w) => message.warning(w))
      }, 500)
    }

    // Reset and close
    setStage(0)
    setFormat(null)
    setResult(null)
    setFileName('')
    onClose()
  }

  const handleClose = () => {
    setStage(0)
    setFormat(null)
    setResult(null)
    setFileName('')
    setError(null)
    onClose()
  }

  // --- Stage 0: Upload ---
  const uploadProps: UploadProps = {
    name: 'file',
    multiple: false,
    accept: '.json,.csv,.xls,.xlsx',
    beforeUpload: handleFile,
    showUploadList: false,
  }

  const renderUpload = () => (
    <div style={{ textAlign: 'center', padding: '24px 0' }}>
      <Dragger {...uploadProps} style={{ padding: 32 }}>
        <p className="ant-upload-drag-icon">
          <InboxOutlined style={{ fontSize: 48, color: '#1E5EFF' }} />
        </p>
        <Title level={4}>点击或拖拽文件到这里</Title>
        <Paragraph type="secondary">
          支持 JSON · CSV · Excel (.xls/.xlsx)
        </Paragraph>
        <Paragraph type="secondary" style={{ fontSize: 12 }}>
          支持格式：Open-Balance 备份 · 微信账单 · 支付宝账单 · 随手记 · 银行流水 · 通用表格
        </Paragraph>
      </Dragger>
      {error && (
        <Alert type="error" message={error} style={{ marginTop: 16 }} closable onClose={() => setError(null)} />
      )}
      {loading && (
        <Card style={{ marginTop: 16 }}>
          <Space>
            <FileTextOutlined spin />
            <Text>正在解析 {fileName}...</Text>
          </Space>
        </Card>
      )}
    </div>
  )

  // --- Stage 1: Preview ---
  const renderPreview = () => {
    if (!result) return null

    const { stats } = result
    const fmtLabel = format ? IMPORT_FORMAT_LABELS[format] : '未知格式'

    const assetColumns = [
      { title: '名称', dataIndex: 'name', key: 'name', ellipsis: true },
      { title: '大类', dataIndex: 'category', key: 'category', render: (v: string) => v, width: 90 },
      { title: '子类', dataIndex: 'subCategory', key: 'subCategory', width: 90 },
      {
        title: '市值', dataIndex: 'marketValue', key: 'marketValue', width: 110,
        render: (v: number) => <Text strong>{formatCNY(v)}</Text>,
      },
      { title: '持有机构', dataIndex: 'heldAt', key: 'heldAt', width: 90 },
    ]

    return (
      <div>
        {/* Format & Stats Card */}
        <Card style={{ marginBottom: 16 }}>
          <Descriptions size="small" column={3}>
            <Descriptions.Item label="检测格式">
              <Tag color="blue">{fmtLabel}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="交易/记录数">
              {stats.totalTransactions} 笔
            </Descriptions.Item>
            <Descriptions.Item label="识别资产">{result.assets.length} 项</Descriptions.Item>
            {stats.periodStart && (
              <Descriptions.Item label="日期范围">
                {stats.periodStart} ~ {stats.periodEnd}
              </Descriptions.Item>
            )}
            {stats.totalIncome > 0 && (
              <Descriptions.Item label="总收入">{formatCNY(stats.totalIncome)}</Descriptions.Item>
            )}
            {stats.totalExpense > 0 && (
              <Descriptions.Item label="总支出">{formatCNY(stats.totalExpense)}</Descriptions.Item>
            )}
          </Descriptions>
        </Card>

        {/* Warnings */}
        {result.warnings.length > 0 && (
          <Alert
            type="warning"
            message="注意事项"
            description={result.warnings.map((w, i) => <div key={i}>• {w}</div>)}
            style={{ marginBottom: 16 }}
          />
        )}

        {/* Asset Preview Table */}
        <Card title={`将导入 ${result.assets.length} 项资产`} size="small">
          <Table
            dataSource={result.assets.map((a, i) => ({ ...a, key: i }))}
            columns={assetColumns}
            size="small"
            pagination={{ pageSize: 10 }}
            scroll={{ x: 600 }}
            summary={() => (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={3}>
                  <Text strong>合计 {result.assets.length} 项</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1} colSpan={3}>
                  <Text strong style={{ color: '#1E5EFF' }}>
                    {formatCNY(result.assets.reduce((s, a) => s + a.marketValue, 0))}
                  </Text>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            )}
          />
        </Card>
      </div>
    )
  }

  // --- Stage 2: Confirmation ---
  const renderConfirm = () => (
    <Result
      icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
      title="确认导入"
      subTitle={
        result
          ? `将导入 ${result.assets.length} 项资产，总计 ${formatCNY(result.assets.reduce((s, a) => s + a.marketValue, 0))}`
          : ''
      }
      extra={
        <Space>
          <Button onClick={() => setStage(1)}>返回预览</Button>
          <Button type="primary" onClick={handleConfirm}>
            确认导入
          </Button>
        </Space>
      }
    />
  )

  return (
    <Modal
      title="导入数据"
      open={open}
      onCancel={handleClose}
      footer={
        stage === 1 ? (
          <Space>
            <Button onClick={() => setStage(0)}>重新选择</Button>
            {result && result.assets.length > 0 && (
              <Button type="primary" onClick={() => setStage(2)}>
                下一步 · 确认
              </Button>
            )}
          </Space>
        ) : stage === 2 ? null : null
      }
      width={800}
      destroyOnClose
    >
      <Steps
        current={stage}
        size="small"
        style={{ marginBottom: 24 }}
        items={[
          { title: '选择文件' },
          { title: '预览解析结果' },
          { title: '确认导入' },
        ]}
      />

      {stage === 0 && renderUpload()}
      {stage === 1 && renderPreview()}
      {stage === 2 && renderConfirm()}
    </Modal>
  )
}
