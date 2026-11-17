import { useState, useMemo } from 'react'
import {
  Card, Table, Button, Modal, Form, Input, InputNumber, Select, Space,
  Tag, Typography, Empty, Popconfirm, Tabs, Row, Col, Statistic,
} from 'antd'
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { useStore } from '../store'
import { useI18n } from '../i18n'
import { ASSET_CATEGORY_ORDER, SUB_CATEGORY_OPTIONS } from '../types'
import type { Asset, AssetCategory, Liquidity, RiskLevel, Currency, Liability, LiabilityType } from '../types'
import { CATEGORY_COLORS } from '../data/marketParams'
import { categoryBreakdown, netWorth } from '../engine/metrics'
import { formatCNY } from '../utils/format'

const { Title, Text } = Typography

export default function Assets() {
  const { assets, liabilities, addAsset, updateAsset, removeAsset, addLiability, updateLiability, removeLiability } = useStore()
  const { t, L } = useI18n()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory>('cash_deposit')
  const [form] = Form.useForm()

  // --- 负债表单状态（独立于资产表单） ---
  const [liabilityModalOpen, setLiabilityModalOpen] = useState(false)
  const [editingLiability, setEditingLiability] = useState<Liability | null>(null)
  const [liabilityForm] = Form.useForm()

  const snapshot = useMemo(() => ({ assets, liabilities, profile: useStore.getState().profile! }), [assets, liabilities])
  const breakdown = useMemo(() => categoryBreakdown(assets), [assets])
  const totalNW = useMemo(() => netWorth(snapshot), [snapshot])

  const treemapData = ASSET_CATEGORY_ORDER
    .filter((cat) => breakdown[cat] > 0)
    .map((cat) => ({
      name: L.category[cat],
      value: breakdown[cat],
      itemStyle: { color: CATEGORY_COLORS[cat] },
      children: assets
        .filter((a) => a.category === cat)
        .map((a) => ({
          name: a.name,
          value: a.marketValue,
        })),
    }))

  const treemapOption = {
    tooltip: { formatter: (p: any) => `${p.name}: ¥${p.value?.toLocaleString()}` },
    series: [{
      type: 'treemap',
      data: treemapData,
      label: { show: true, formatter: '{b}' },
      upperLabel: { show: true, height: 30 },
      levels: [{ itemStyle: { gapWidth: 1 } }, { colorSaturation: [0.35, 0.5] }],
    }],
  }

  const openCreate = (category?: AssetCategory) => {
    setEditingAsset(null)
    setSelectedCategory(category ?? 'cash_deposit')
    form.resetFields()
    form.setFieldsValue({ category: category ?? 'cash_deposit', currency: 'CNY', liquidity: 'high', riskLevel: 'low' })
    setModalOpen(true)
  }

  const openEdit = (asset: Asset) => {
    setEditingAsset(asset)
    setSelectedCategory(asset.category)
    form.setFieldsValue(asset)
    setModalOpen(true)
  }

  const handleSave = async () => {
    const values = await form.validateFields()
    if (editingAsset) {
      updateAsset(editingAsset.id, values)
    } else {
      addAsset(values)
    }
    setModalOpen(false)
    form.resetFields()
  }

  // --- 负债操作 ---

  const openLiabilityCreate = () => {
    setEditingLiability(null)
    liabilityForm.resetFields()
    liabilityForm.setFieldsValue({ type: '房贷' })
    setLiabilityModalOpen(true)
  }

  const openLiabilityEdit = (liability: Liability) => {
    setEditingLiability(liability)
    liabilityForm.setFieldsValue(liability)
    setLiabilityModalOpen(true)
  }

  const handleSaveLiability = async () => {
    const values = await liabilityForm.validateFields()
    if (editingLiability) {
      updateLiability(editingLiability.id, values)
    } else {
      addLiability(values)
    }
    setLiabilityModalOpen(false)
    liabilityForm.resetFields()
  }

  const columns = [
    { title: t('assets.col.name'), dataIndex: 'name', key: 'name', width: 150 },
    { title: t('assets.col.category'), dataIndex: 'category', key: 'category', width: 100, render: (c: AssetCategory) => L.category[c] },
    { title: t('assets.col.subCategory'), dataIndex: 'subCategory', key: 'subCategory', width: 100 },
    {
      title: '市值', dataIndex: 'marketValue', key: 'marketValue', width: 130,
      render: (v: number) => <Text strong>{formatCNY(v)}</Text>,
    },
    { title: t('assets.col.currency'), dataIndex: 'currency', key: 'currency', width: 60, render: (c: Currency) => L.currency[c] },
    {
      title: '流动性', dataIndex: 'liquidity', key: 'liquidity', width: 80,
      render: (l: Liquidity) => <Tag color={l === 'high' ? 'green' : l === 'medium' ? 'orange' : 'red'}>{L.liquidity[l]}</Tag>,
    },
    {
      title: '风险', dataIndex: 'riskLevel', key: 'riskLevel', width: 80,
      render: (r: RiskLevel) => <Tag color={r === 'low' ? 'green' : r === 'medium' ? 'orange' : 'red'}>{L.riskLevel[r]}</Tag>,
    },
    {
      title: '操作', key: 'action', width: 100,
      render: (_: unknown, record: Asset) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Popconfirm title={t('common.confirmDelete')} onConfirm={() => removeAsset(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  // Liability columns
  const liabilityColumns = [
    { title: t('assets.col.name'), dataIndex: 'name', key: 'name' },
    { title: t('assets.col.type'), dataIndex: 'type', key: 'type', width: 80 },
    {
      title: '剩余本金', dataIndex: 'remainingPrincipal', key: 'remainingPrincipal',
      render: (v: number) => formatCNY(v),
    },
    {
      title: '利率', dataIndex: 'annualRatePct', key: 'annualRatePct',
      render: (v: number) => `${v.toFixed(2)}%`,
    },
    {
      title: '月供', dataIndex: 'monthlyPayment', key: 'monthlyPayment',
      render: (v: number) => formatCNY(v),
    },
    {
      title: '剩余月数', dataIndex: 'remainingMonths', key: 'remainingMonths',
    },
    {
      title: '操作', key: 'action', width: 100,
      render: (_: unknown, record: Liability) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openLiabilityEdit(record)} />
          <Popconfirm title={t('common.confirmDelete')} onConfirm={() => removeLiability(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const categorySelect = (
    <Select
      value={selectedCategory}
      onChange={(v) => { setSelectedCategory(v); form.setFieldValue('category', v); form.setFieldValue('subCategory', undefined) }}
      style={{ width: 200 }}
      options={ASSET_CATEGORY_ORDER.map((cat) => ({ value: cat, label: L.category[cat] }))}
    />
  )

  const tabItems = [
    {
      key: 'assets',
      label: t('assets.tab.assets', { count: assets.length }),
      children: (
        <div>
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col span={8}><Card size="small"><Statistic title={t('assets.stat.totalAssets')} value={formatCNY(assets.reduce((s, a) => s + a.marketValue, 0))} /></Card></Col>
            <Col span={8}><Card size="small"><Statistic title={t('assets.stat.netWorth')} value={formatCNY(totalNW)} /></Card></Col>
            <Col span={8}><Card size="small"><Statistic title={t('assets.stat.assetCount')} value={assets.length} suffix={t('assets.stat.countSuffix')} /></Card></Col>
          </Row>
          <Space style={{ marginBottom: 16 }}>
            {categorySelect}
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openCreate(selectedCategory)}>
              {t('assets.addAsset')}
            </Button>
          </Space>
          <Table dataSource={assets} columns={columns} rowKey="id" size="small" pagination={{ pageSize: 20 }} />
        </div>
      ),
    },
    {
      key: 'liabilities',
      label: t('assets.tab.liabilities', { count: liabilities.length }),
      children: (
        <div>
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col span={8}><Card size="small"><Statistic title={t('assets.stat.totalLiabilities')} value={formatCNY(liabilities.reduce((s, l) => s + l.remainingPrincipal, 0))} /></Card></Col>
            <Col span={8}><Card size="small"><Statistic title={t('assets.stat.monthlyPayments')} value={formatCNY(liabilities.reduce((s, l) => s + l.monthlyPayment, 0))} /></Card></Col>
            <Col span={8}><Card size="small"><Statistic title={t('assets.stat.liabilityCount')} value={liabilities.length} suffix={t('assets.stat.countSuffix')} /></Card></Col>
          </Row>
          <Button type="primary" icon={<PlusOutlined />} onClick={openLiabilityCreate} style={{ marginBottom: 16 }}>
            {t('assets.addLiability')}
          </Button>
          <Table dataSource={liabilities} columns={liabilityColumns} rowKey="id" size="small" pagination={{ pageSize: 20 }} />
        </div>
      ),
    },
    {
      key: 'chart',
      label: t('assets.tab.chart'),
      children: treemapData.length > 0
        ? <ReactECharts option={treemapOption} style={{ height: 500 }} />
        : <Empty description={t('dashboard.noData')} />,
    },
  ]

  return (
    <div>
      <Title level={4}>{t('assets.title')}</Title>
      <Tabs items={tabItems} />

      {/* Asset Form Modal */}
      <Modal
        title={editingAsset ? t('assets.form.assetTitle.edit') : t('assets.form.assetTitle.create')}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => { setModalOpen(false); form.resetFields() }}
        width={600}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="category" label={t('assets.form.category')} rules={[{ required: true }]}>
            <Select options={ASSET_CATEGORY_ORDER.map((cat) => ({ value: cat, label: L.category[cat] }))}
              onChange={(v) => setSelectedCategory(v)} />
          </Form.Item>
          <Form.Item name="name" label={t('assets.form.name')} rules={[{ required: true }]}>
            <Input placeholder={t('assets.form.name.ph')} />
          </Form.Item>
          <Form.Item name="subCategory" label={t('assets.form.subCategory')}>
            <Select options={SUB_CATEGORY_OPTIONS[selectedCategory].map((s) => ({ value: s, label: s }))} allowClear />
          </Form.Item>
          <Form.Item name="marketValue" label={t('assets.form.marketValue')} rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="currency" label={t('assets.col.currency')}>
                <Select options={Object.entries(L.currency).map(([k, v]) => ({ value: k, label: v }))} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="liquidity" label={t('assets.col.liquidity')}>
                <Select options={Object.entries(L.liquidity).map(([k, v]) => ({ value: k, label: v }))} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="riskLevel" label={t('assets.col.risk')}>
                <Select options={Object.entries(L.riskLevel).map(([k, v]) => ({ value: k, label: v }))} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="heldAt" label={t('assets.form.heldAt')}>
            <Input placeholder={t('assets.form.heldAt.ph')} />
          </Form.Item>
          {selectedCategory === 'fixed_income' && (
            <Form.Item name="issuer" label={t('assets.form.issuer')}
              extra={t('assets.form.issuer.extra')}>
              <Input placeholder={t('assets.form.issuer.ph')} />
            </Form.Item>
          )}
          {selectedCategory === 'insurance' && (
            <>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="insuranceCoverage" label={t('assets.form.coverage')}>
                    <InputNumber style={{ width: '100%' }} min={0} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="insuranceAnnualPremium" label={t('assets.form.premium')}>
                    <InputNumber style={{ width: '100%' }} min={0} />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}
          <Form.Item name="notes" label={t('assets.form.notes')}>
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Liability Form Modal */}
      <Modal
        title={editingLiability ? t('assets.liability.title.edit') : t('assets.liability.title.create')}
        open={liabilityModalOpen}
        onOk={handleSaveLiability}
        onCancel={() => { setLiabilityModalOpen(false); liabilityForm.resetFields() }}
        width={600}
        destroyOnClose
      >
        <Form form={liabilityForm} layout="vertical">
          <Form.Item name="name" label={t('assets.liability.name')} rules={[{ required: true, message: t('assets.required.name') }]}>
            <Input placeholder={t('assets.liability.name.ph')} />
          </Form.Item>
          <Form.Item name="type" label={t('assets.liability.type')} rules={[{ required: true }]}>
            <Select
              options={(['房贷', '车贷', '消费贷', '经营贷', '其他'] as LiabilityType[]).map((t) => ({ value: t, label: t }))}
            />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="remainingPrincipal" label={t('assets.liability.principal')} rules={[{ required: true, message: t('assets.required.principal') }]}>
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="annualRatePct" label={t('assets.liability.rate')} rules={[{ required: true, message: t('assets.required.rate') }]}>
                <InputNumber style={{ width: '100%' }} min={0} max={36} step={0.01} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="monthlyPayment" label={t('assets.liability.payment')} rules={[{ required: true, message: t('assets.required.payment') }]}>
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="remainingMonths" label={t('assets.liability.months')} rules={[{ required: true, message: t('assets.required.months') }]}>
                <InputNumber style={{ width: '100%' }} min={1} max={600} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="collateralAssetId" label={t('assets.liability.collateral')}
            extra={t('assets.liability.collateral.extra')}>
            <Select
              allowClear
              placeholder={t('assets.liability.collateral.ph')}
              options={assets
                .filter((a) => a.category === 'real_estate')
                .map((a) => ({ value: a.id, label: a.name }))}
            />
          </Form.Item>
          <Form.Item name="notes" label={t('assets.form.notes')}>
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
