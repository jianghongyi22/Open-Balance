import { useState } from 'react'
import {
  Modal, Upload, Steps, Button, Space, Card, Typography, Table, Tag,
  Alert, Result, Descriptions, message,
} from 'antd'
import {
  InboxOutlined, FileTextOutlined, CheckCircleOutlined,
} from '@ant-design/icons'
import type { UploadProps } from 'antd'
import { detectAndImport, importWithColumnMap, autoMapColumns } from '../importer'
import { IMPORT_FORMAT_LABELS } from '../importer'
import type { ImportFormat, ImportResult, ColumnMap } from '../importer/types'
import type { ParsedWorkbook } from '../importer/spreadsheet'
import ColumnMappingTable from './ColumnMappingTable'
import { useStore } from '../store'
import { useI18n } from '../i18n'
import { formatCNY } from '../utils/format'

const { Title, Text, Paragraph } = Typography
const { Dragger } = Upload

/** 简单字符串哈希（djb2），用于列映射按表头签名持久化 */
function hashHeaders(headers: string[]): string {
  const key = headers.join('|')
  let h = 5381
  for (let i = 0; i < key.length; i++) {
    h = ((h << 5) + h + key.charCodeAt(i)) >>> 0
  }
  return h.toString(36)
}

const COLUMN_MAP_KEY_PREFIX = 'open-balance-colmap-'

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
  // 通用 CSV 列映射（用户可纠正）
  const [workbook, setWorkbook] = useState<ParsedWorkbook | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [columnMap, setColumnMap] = useState<ColumnMap | null>(null)

  const { importAssets, importLiabilities, setProfile, updateProfile } = useStore()
  const { t, L } = useI18n()

  const handleFile = async (file: File) => {
    setLoading(true)
    setError(null)
    setFileName(file.name)

    try {
      const { format: fmt, result: res, workbook: wb, headers: hdrs } = await detectAndImport(file)
      setFormat(fmt)
      setResult(res)
      setWorkbook(wb)
      setHeaders(hdrs)
      // 通用 CSV：加载用户保存过的映射，否则用自动匹配结果
      if (fmt === 'csv-generic' && hdrs.length > 0) {
        const savedKey = COLUMN_MAP_KEY_PREFIX + hashHeaders(hdrs)
        try {
          const saved = localStorage.getItem(savedKey)
          setColumnMap(saved ? (JSON.parse(saved) as ColumnMap) : autoMapColumns(hdrs))
        } catch {
          setColumnMap(autoMapColumns(hdrs))
        }
      } else {
        setColumnMap(null)
      }
      setStage(1)
    } catch (e: any) {
      setError(e.message || t('import.failed'))
    } finally {
      setLoading(false)
    }

    return false // Prevent upload
  }

  const handleColumnMapChange = (map: ColumnMap) => {
    setColumnMap(map)
    if (!workbook) return
    // 按表头签名持久化，下次同类文件复用
    try {
      localStorage.setItem(COLUMN_MAP_KEY_PREFIX + hashHeaders(headers), JSON.stringify(map))
    } catch {
      // 存储失败不阻塞
    }
    const reparse = importWithColumnMap(workbook, map, fileName)
    setResult(reparse)
  }

  const handleConfirm = () => {
    if (!result || result.assets.length === 0) {
      message.warning(t('import.empty'))
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

    message.success(t('import.success', { n: result.assets.length }))

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

  const handleApplyConsumption = () => {
    if (!result?.stats.consumptionMonthly) return
    const value = Math.round(result.stats.consumptionMonthly)
    updateProfile({ monthlyEssentialExpense: value })
    message.success(t('import.consumptionApplied', { value: formatCNY(value) }))
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
        <Title level={4}>{t('import.drop.title')}</Title>
        <Paragraph type="secondary">
          {t('import.drop.formats')}
        </Paragraph>
        <Paragraph type="secondary" style={{ fontSize: 12 }}>
          {t('import.drop.sources')}
        </Paragraph>
      </Dragger>
      {error && (
        <Alert type="error" message={error} style={{ marginTop: 16 }} closable onClose={() => setError(null)} />
      )}
      {loading && (
        <Card style={{ marginTop: 16 }}>
          <Space>
            <FileTextOutlined spin />
            <Text>{t('import.parsing', { file: fileName })}</Text>
          </Space>
        </Card>
      )}
    </div>
  )

  // --- Stage 1: Preview ---
  const renderPreview = () => {
    if (!result) return null

    const { stats } = result
    const fmtLabel = format ? IMPORT_FORMAT_LABELS[format] : t('import.unknownFormat')

    const assetColumns = [
      { title: t('assets.col.name'), dataIndex: 'name', key: 'name', ellipsis: true },
      { title: t('assets.col.category'), dataIndex: 'category', key: 'category', render: (v: string) => L.category[v as keyof typeof L.category] ?? v, width: 90 },
      { title: t('assets.col.subCategory'), dataIndex: 'subCategory', key: 'subCategory', width: 90 },
      {
        title: '市值', dataIndex: 'marketValue', key: 'marketValue', width: 110,
        render: (v: number) => <Text strong>{formatCNY(v)}</Text>,
      },
      { title: t('assets.form.heldAt'), dataIndex: 'heldAt', key: 'heldAt', width: 90 },
    ]

    return (
      <div>
        {/* Format & Stats Card */}
        <Card style={{ marginBottom: 16 }}>
          <Descriptions size="small" column={3}>
            <Descriptions.Item label={t('import.format')}>
              <Tag color="blue">{fmtLabel}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label={t('import.txCount')}>
              {t('import.txCountValue', { n: stats.totalTransactions })}
            </Descriptions.Item>
            <Descriptions.Item label={t('import.assetCount')}>{t('import.assetCountValue', { n: result.assets.length })}</Descriptions.Item>
            {stats.periodStart && (
              <Descriptions.Item label={t('import.dateRange')}>
                {stats.periodStart} ~ {stats.periodEnd}
              </Descriptions.Item>
            )}
            {stats.totalIncome > 0 && (
              <Descriptions.Item label={t('import.totalIncome')}>{formatCNY(stats.totalIncome)}</Descriptions.Item>
            )}
            {stats.totalExpense > 0 && (
              <Descriptions.Item label={t('import.totalExpense')}>{formatCNY(stats.totalExpense)}</Descriptions.Item>
            )}
          </Descriptions>

          {/* 消费识别：月均生活消费估算，可一键校准家庭档案 */}
          {stats.consumptionMonthly && stats.consumptionMonthly > 0 && (
            <Space wrap style={{ marginTop: 8 }}>
              <Tag color="green">{t('import.consumption')}</Tag>
              <Text strong>
                {t('import.consumptionValue', {
                  monthly: formatCNY(stats.consumptionMonthly),
                  count: stats.consumptionTxCount,
                  months: stats.consumptionMonths,
                })}
              </Text>
              <Button size="small" type="link" onClick={handleApplyConsumption}>
                {t('import.applyConsumption')}
              </Button>
            </Space>
          )}
        </Card>

        {/* 通用 CSV：可编辑列映射 */}
        {format === 'csv-generic' && headers.length > 0 && columnMap && (
          <Card title={t('import.columnMap')} size="small" style={{ marginBottom: 16 }}>
            <ColumnMappingTable
              headers={headers}
              columnMap={columnMap}
              onChange={handleColumnMapChange}
            />
          </Card>
        )}

        {/* Warnings */}
        {result.warnings.length > 0 && (
          <Alert
            type="warning"
            message={t('import.warnings')}
            description={result.warnings.map((w, i) => <div key={i}>• {w}</div>)}
            style={{ marginBottom: 16 }}
          />
        )}

        {/* Asset Preview Table */}
        <Card title={t('import.previewTitle', { n: result.assets.length })} size="small">
          <Table
            dataSource={result.assets.map((a, i) => ({ ...a, key: i }))}
            columns={assetColumns}
            size="small"
            pagination={{ pageSize: 10 }}
            scroll={{ x: 600 }}
            summary={() => (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={3}>
                  <Text strong>{t('import.totalAssets', { n: result.assets.length })}</Text>
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
      title={t('import.confirmTitle')}
      subTitle={
        result
          ? t('import.confirmDesc', { n: result.assets.length, total: formatCNY(result.assets.reduce((s, a) => s + a.marketValue, 0)) })
          : ''
      }
      extra={
        <Space>
          <Button onClick={() => setStage(1)}>{t('import.backPreview')}</Button>
          <Button type="primary" onClick={handleConfirm}>
            {t('import.confirm')}
          </Button>
        </Space>
      }
    />
  )

  return (
    <Modal
      title={t('import.title')}
      open={open}
      onCancel={handleClose}
      footer={
        stage === 1 ? (
          <Space>
            <Button onClick={() => setStage(0)}>{t('import.reselect')}</Button>
            {result && result.assets.length > 0 && (
              <Button type="primary" onClick={() => setStage(2)}>
                {t('import.nextConfirm')}
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
          { title: t('import.step.0') },
          { title: t('import.step.1') },
          { title: t('import.step.2') },
        ]}
      />

      {stage === 0 && renderUpload()}
      {stage === 1 && renderPreview()}
      {stage === 2 && renderConfirm()}
    </Modal>
  )
}
