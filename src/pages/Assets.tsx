import { useState, useMemo } from 'react'
import {
  Card, Table, Button, Modal, Form, Input, InputNumber, Select, Space,
  Tag, Typography, Empty, Popconfirm, Tabs, Row, Col, Statistic,
} from 'antd'
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { useStore } from '../store'
import {
  ASSET_CATEGORY_LABELS, ASSET_CATEGORY_ORDER, SUB_CATEGORY_OPTIONS,
  LIQUIDITY_LABELS, RISK_LEVEL_LABELS, CURRENCY_LABELS,
} from '../types'
import type { Asset, AssetCategory, Liquidity, RiskLevel, Currency, Liability, LiabilityType } from '../types'
import { CATEGORY_COLORS } from '../data/marketParams'
import { categoryBreakdown, totalAssets, totalLiabilities, netWorth } from '../engine/metrics'
import { formatCNY } from '../utils/format'

const { Title, Text } = Typography

export default function Assets() {
  const { assets, liabilities, addAsset, updateAsset, removeAsset, addLiability, updateLiability, removeLiability } = useStore()
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
      name: ASSET_CATEGORY_LABELS[cat],
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
    { title: '名称', dataIndex: 'name', key: 'name', width: 150 },
    { title: '分类', dataIndex: 'category', key: 'category', width: 100, render: (c: AssetCategory) => ASSET_CATEGORY_LABELS[c] },
    { title: '子类', dataIndex: 'subCategory', key: 'subCategory', width: 100 },
    {
      title: '市值', dataIndex: 'marketValue', key: 'marketValue', width: 130,
      render: (v: number) => <Text strong>{formatCNY(v)}</Text>,
    },
    { title: '币种', dataIndex: 'currency', key: 'currency', width: 60, render: (c: Currency) => CURRENCY_LABELS[c] },
    {
      title: '流动性', dataIndex: 'liquidity', key: 'liquidity', width: 80,
      render: (l: Liquidity) => <Tag color={l === 'high' ? 'green' : l === 'medium' ? 'orange' : 'red'}>{LIQUIDITY_LABELS[l]}</Tag>,
    },
    {
      title: '风险', dataIndex: 'riskLevel', key: 'riskLevel', width: 80,
      render: (r: RiskLevel) => <Tag color={r === 'low' ? 'green' : r === 'medium' ? 'orange' : 'red'}>{RISK_LEVEL_LABELS[r]}</Tag>,
    },
    {
      title: '操作', key: 'action', width: 100,
      render: (_: unknown, record: Asset) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Popconfirm title="确认删除？" onConfirm={() => removeAsset(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  // Liability columns
  const liabilityColumns = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '类型', dataIndex: 'type', key: 'type', width: 80 },
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
          <Popconfirm title="确认删除？" onConfirm={() => removeLiability(record.id)}>
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
      options={ASSET_CATEGORY_ORDER.map((cat) => ({ value: cat, label: ASSET_CATEGORY_LABELS[cat] }))}
    />
  )

  const tabItems = [
    {
      key: 'assets',
      label: `资产 (${assets.length})`,
      children: (
        <div>
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col span={8}><Card size="small"><Statistic title="总资产" value={formatCNY(assets.reduce((s, a) => s + a.marketValue, 0))} /></Card></Col>
            <Col span={8}><Card size="small"><Statistic title="净资产" value={formatCNY(totalNW)} /></Card></Col>
            <Col span={8}><Card size="small"><Statistic title="资产项数" value={assets.length} suffix="项" /></Card></Col>
          </Row>
          <Space style={{ marginBottom: 16 }}>
            {categorySelect}
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openCreate(selectedCategory)}>
              添加资产
            </Button>
          </Space>
          <Table dataSource={assets} columns={columns} rowKey="id" size="small" pagination={{ pageSize: 20 }} />
        </div>
      ),
    },
    {
      key: 'liabilities',
      label: `负债 (${liabilities.length})`,
      children: (
        <div>
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col span={8}><Card size="small"><Statistic title="总负债" value={formatCNY(liabilities.reduce((s, l) => s + l.remainingPrincipal, 0))} /></Card></Col>
            <Col span={8}><Card size="small"><Statistic title="月供合计" value={formatCNY(liabilities.reduce((s, l) => s + l.monthlyPayment, 0))} /></Card></Col>
            <Col span={8}><Card size="small"><Statistic title="负债项数" value={liabilities.length} suffix="项" /></Card></Col>
          </Row>
          <Button type="primary" icon={<PlusOutlined />} onClick={openLiabilityCreate} style={{ marginBottom: 16 }}>
            添加负债
          </Button>
          <Table dataSource={liabilities} columns={liabilityColumns} rowKey="id" size="small" pagination={{ pageSize: 20 }} />
        </div>
      ),
    },
    {
      key: 'chart',
      label: '资产分布图',
      children: treemapData.length > 0
        ? <ReactECharts option={treemapOption} style={{ height: 500 }} />
        : <Empty description="暂无资产数据" />,
    },
  ]

  return (
    <div>
      <Title level={4}>资产台账</Title>
      <Tabs items={tabItems} />

      {/* Asset Form Modal */}
      <Modal
        title={editingAsset ? '编辑资产' : '添加资产'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => { setModalOpen(false); form.resetFields() }}
        width={600}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="category" label="资产大类" rules={[{ required: true }]}>
            <Select options={ASSET_CATEGORY_ORDER.map((cat) => ({ value: cat, label: ASSET_CATEGORY_LABELS[cat] }))}
              onChange={(v) => setSelectedCategory(v)} />
          </Form.Item>
          <Form.Item name="name" label="资产名称" rules={[{ required: true }]}>
            <Input placeholder="例如：招商银行活期、自住房·xx小区" />
          </Form.Item>
          <Form.Item name="subCategory" label="子类">
            <Select options={SUB_CATEGORY_OPTIONS[selectedCategory].map((s) => ({ value: s, label: s }))} allowClear />
          </Form.Item>
          <Form.Item name="marketValue" label="当前市值 (¥)" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="currency" label="币种">
                <Select options={Object.entries(CURRENCY_LABELS).map(([k, v]) => ({ value: k, label: v }))} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="liquidity" label="流动性">
                <Select options={Object.entries(LIQUIDITY_LABELS).map(([k, v]) => ({ value: k, label: v }))} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="riskLevel" label="风险等级">
                <Select options={Object.entries(RISK_LEVEL_LABELS).map(([k, v]) => ({ value: k, label: v }))} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="heldAt" label="持有机构">
            <Input placeholder="银行/券商/保险公司名" />
          </Form.Item>
          {selectedCategory === 'fixed_income' && (
            <Form.Item name="issuer" label="发行方/产品管理人"
              extra="用于固收集中度计算，与持有机构分开填写（如：招银理财）">
              <Input placeholder="如：招银理财、易方达基金" />
            </Form.Item>
          )}
          {selectedCategory === 'insurance' && (
            <>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="insuranceCoverage" label="保额 (¥)">
                    <InputNumber style={{ width: '100%' }} min={0} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="insuranceAnnualPremium" label="年保费 (¥)">
                    <InputNumber style={{ width: '100%' }} min={0} />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}
          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Liability Form Modal */}
      <Modal
        title={editingLiability ? '编辑负债' : '添加负债'}
        open={liabilityModalOpen}
        onOk={handleSaveLiability}
        onCancel={() => { setLiabilityModalOpen(false); liabilityForm.resetFields() }}
        width={600}
        destroyOnClose
      >
        <Form form={liabilityForm} layout="vertical">
          <Form.Item name="name" label="负债名称" rules={[{ required: true, message: '请输入负债名称' }]}>
            <Input placeholder="例如：自住房按揭贷款、车贷" />
          </Form.Item>
          <Form.Item name="type" label="负债类型" rules={[{ required: true }]}>
            <Select
              options={(['房贷', '车贷', '消费贷', '经营贷', '其他'] as LiabilityType[]).map((t) => ({ value: t, label: t }))}
            />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="remainingPrincipal" label="剩余本金 (¥)" rules={[{ required: true, message: '请输入剩余本金' }]}>
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="annualRatePct" label="年利率 (%)" rules={[{ required: true, message: '请输入年利率' }]}>
                <InputNumber style={{ width: '100%' }} min={0} max={36} step={0.01} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="monthlyPayment" label="月供 (¥)" rules={[{ required: true, message: '请输入月供' }]}>
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="remainingMonths" label="剩余月数" rules={[{ required: true, message: '请输入剩余月数' }]}>
                <InputNumber style={{ width: '100%' }} min={1} max={600} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="collateralAssetId" label="关联抵押资产（可选）"
            extra="选择对应的房产资产，便于联动分析">
            <Select
              allowClear
              placeholder="无抵押资产"
              options={assets
                .filter((a) => a.category === 'real_estate')
                .map((a) => ({ value: a.id, label: a.name }))}
            />
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
