import { useMemo } from 'react'
import { Row, Col, Card, Statistic, Tag, Typography, Empty, Button, Space } from 'antd'
import {
  WarningOutlined, CheckCircleOutlined, ExclamationCircleOutlined, CloseCircleOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { diagnose } from '../engine'
import { categoryBreakdown, netWorth, emergencyMonths, debtToIncome, leverageRatio, liquidityRatio, spQuadrantAllocation } from '../engine/metrics'
import { ASSET_CATEGORY_LABELS, ASSET_CATEGORY_ORDER } from '../types'
import { CATEGORY_COLORS } from '../data/marketParams'
import { formatCNY } from '../utils/format'
import DisclaimerBanner from '../components/DisclaimerBanner'

const { Title, Text } = Typography

export default function Dashboard() {
  const navigate = useNavigate()
  const { assets, liabilities, profile } = useStore()

  const snapshot = useMemo(() => ({ assets, liabilities, profile: profile! }), [assets, liabilities, profile])
  const report = useMemo(() => diagnose(snapshot), [snapshot])
  const breakdown = useMemo(() => categoryBreakdown(assets), [assets])
  const totalNW = useMemo(() => netWorth(snapshot), [snapshot])
  const em = useMemo(() => emergencyMonths(snapshot), [snapshot])
  const dti = useMemo(() => debtToIncome(snapshot), [snapshot])
  const lev = useMemo(() => leverageRatio(snapshot), [snapshot])
  const lr = useMemo(() => liquidityRatio(assets), [assets])

  const allocationData = ASSET_CATEGORY_ORDER
    .filter((cat) => breakdown[cat] > 0)
    .map((cat) => ({
      name: ASSET_CATEGORY_LABELS[cat],
      value: breakdown[cat],
      itemStyle: { color: CATEGORY_COLORS[cat] },
    }))

  const allocationOption = {
    tooltip: { trigger: 'item', formatter: '{b}: ¥{c} ({d}%)' },
    series: [{
      type: 'pie',
      radius: ['45%', '75%'],
      center: ['50%', '50%'],
      data: allocationData,
      label: { formatter: '{b}\n{d}%', fontSize: 11 },
      emphasis: { label: { fontSize: 16, fontWeight: 'bold' } },
    }],
  }

  const quadrantData = useMemo(() => {
    const alloc = spQuadrantAllocation(assets)
    return [
      { name: '要花的钱', value: alloc.shortTerm },
      { name: '保命的钱', value: alloc.protection },
      { name: '生钱的钱', value: alloc.growth },
      { name: '保本升值', value: alloc.stable },
    ]
  }, [assets])

  const quadrantOption = {
    radar: {
      indicator: [
        { name: '要花的钱\n(短期)', max: 0.6 },
        { name: '保命的钱\n(保障)', max: 0.6 },
        { name: '生钱的钱\n(增值)', max: 0.6 },
        { name: '保本升值\n(稳健)', max: 0.6 },
      ],
      center: ['50%', '55%'],
      radius: '70%',
    },
    series: [{
      type: 'radar',
      data: [{
        value: quadrantData.map((d) => d.value),
        name: '当前配置',
        areaStyle: { color: 'rgba(30, 94, 255, 0.15)' },
        lineStyle: { color: '#1E5EFF', width: 2 },
        itemStyle: { color: '#1E5EFF' },
      }, {
        value: [0.10, 0.20, 0.30, 0.40],
        name: '目标配置',
        areaStyle: { color: 'rgba(0,0,0,0.02)' },
        lineStyle: { color: '#999', width: 1, type: 'dashed' as const },
        itemStyle: { color: '#999' },
      }],
    }],
  }

  const statusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircleOutlined style={{ color: '#52c41a' }} />
      case 'warn': return <ExclamationCircleOutlined style={{ color: '#faad14' }} />
      case 'fail': return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
    }
  }

  const gradeColor = report.grade === 'A' ? '#52c41a' : report.grade === 'B' ? '#1890ff' : report.grade === 'C' ? '#faad14' : '#ff4d4f'

  if (!profile) return <Empty description="请先完成引导" />

  return (
    <div>
      <DisclaimerBanner compact />
      <Row gutter={[16, 16]}>
        {/* Hero: Net Worth + Grade */}
        <Col span={24}>
          <Card>
            <Row align="middle" justify="space-between">
              <Col>
                <Text type="secondary">净资产</Text>
                <Title level={2} style={{ margin: '4px 0 0' }}>
                  {formatCNY(totalNW)}
                </Title>
                <Space>
                  <Text type="secondary">总资产 {formatCNY(assets.reduce((s, a) => s + a.marketValue, 0))}</Text>
                  <Text type="secondary">| 负债 {formatCNY(liabilities.reduce((s, l) => s + l.remainingPrincipal, 0))}</Text>
                </Space>
              </Col>
              <Col style={{ textAlign: 'center' }}>
                <div style={{
                  width: 80, height: 80, borderRadius: '50%',
                  border: `6px solid ${gradeColor}`, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  flexDirection: 'column',
                }}>
                  <Text strong style={{ fontSize: 24, color: gradeColor }}>{report.grade}</Text>
                  <Text style={{ fontSize: 11, color: gradeColor }}>{report.gradeLabel}</Text>
                </div>
                <Text style={{ fontSize: 12, color: '#999', display: 'block', marginTop: 4 }}>
                  综合评分 {report.overallScore}
                </Text>
              </Col>
            </Row>
          </Card>
        </Col>

        {/* KPI Cards */}
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic title="应急备用金" value={em.toFixed(1)} suffix="个月"
              valueStyle={{ color: em >= 6 ? '#52c41a' : em >= 3 ? '#faad14' : '#ff4d4f' }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic title="月供收入比" value={(dti * 100).toFixed(1)} suffix="%"
              valueStyle={{ color: dti <= 0.4 ? '#52c41a' : dti <= 0.5 ? '#faad14' : '#ff4d4f' }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic title="总负债率" value={(lev * 100).toFixed(1)} suffix="%"
              valueStyle={{ color: lev <= 0.4 ? '#52c41a' : lev <= 0.6 ? '#faad14' : '#ff4d4f' }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic title="流动性占比" value={(lr * 100).toFixed(1)} suffix="%"
              valueStyle={{ color: lr >= 0.15 ? '#52c41a' : lr >= 0.08 ? '#faad14' : '#ff4d4f' }} />
          </Card>
        </Col>

        {/* Allocation Donut */}
        <Col xs={24} md={12}>
          <Card title="资产配置结构">
            {allocationData.length > 0 ? (
              <ReactECharts option={allocationOption} style={{ height: 320 }} />
            ) : <Empty description="暂无资产数据" />}
          </Card>
        </Col>

        {/* Quadrant Radar */}
        <Col xs={24} md={12}>
          <Card title="标准普尔四象限">
            <ReactECharts option={quadrantOption} style={{ height: 320 }} />
          </Card>
        </Col>

        {/* Critical Alerts */}
        <Col span={24}>
          <Card
            title={<Space><WarningOutlined style={{ color: '#ff4d4f' }} />需要关注</Space>}
            extra={<Button type="link" onClick={() => navigate('/report')}>查看完整报告 →</Button>}
          >
            {report.checks.filter((c) => c.status === 'fail').slice(0, 3).length === 0 ? (
              <Text type="secondary">所有关键检查通过，暂无紧急风险</Text>
            ) : (
              report.checks.filter((c) => c.status === 'fail').slice(0, 3).map((c) => (
                <Card key={c.id} size="small" style={{ marginBottom: 8 }} type="inner">
                  <Space>
                    {statusIcon(c.status)}
                    <Text strong>{c.name}</Text>
                    <Tag color={c.severity === 'critical' ? 'red' : c.severity === 'high' ? 'orange' : 'blue'}>
                      {c.severity === 'critical' ? '临界' : c.severity === 'high' ? '高' : c.severity === 'medium' ? '中' : '低'}
                    </Tag>
                  </Space>
                  <br />
                  <Text type="secondary" style={{ fontSize: 13 }}>{c.description}</Text>
                </Card>
              ))
            )}
            {report.checks.filter((c) => c.status === 'fail').length > 3 && (
              <Text type="secondary">...还有 {report.checks.filter((c) => c.status === 'fail').length - 3} 项未通过</Text>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}
