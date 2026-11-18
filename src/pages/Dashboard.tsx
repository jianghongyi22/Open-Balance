import { useMemo, useEffect, useRef, useState } from 'react'
import { Row, Col, Card, Statistic, Tag, Typography, Empty, Button, Space, Alert } from 'antd'
import {
  WarningOutlined, CheckCircleOutlined, ExclamationCircleOutlined, CloseCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { useNavigate } from 'react-router-dom'
import { useStore, daysBetween } from '../store'
import { useI18n } from '../i18n'
import { diagnose } from '../engine'
import { categoryBreakdown, netWorth, emergencyMonths, debtToIncome, leverageRatio, liquidityRatio, spQuadrantAllocation } from '../engine/metrics'
import { ASSET_CATEGORY_ORDER } from '../types'
import { CATEGORY_COLORS } from '../data/marketParams'
import { REASSESS_REMINDER_DAYS } from '../data/thresholds'
import { formatCNY } from '../utils/format'
import DisclaimerBanner from '../components/DisclaimerBanner'

const { Title, Text } = Typography

export default function Dashboard() {
  const navigate = useNavigate()
  const { assets, liabilities, profile, snapshots, addSnapshot, lastVisitAt, setLastVisitAt } = useStore()
  const { t, locale, L } = useI18n()

  // 定期重新评估提醒（#26）：距上次访问超过阈值时提示
  // 天数在首次渲染时从持久化的 lastVisitAt 一次性算出，避免 effect 内 setState
  const [daysSinceVisit] = useState<number>(() =>
    lastVisitAt ? daysBetween(lastVisitAt, new Date().toISOString()) : 0
  )
  const visitRecorded = useRef(false)
  useEffect(() => {
    if (visitRecorded.current) return
    visitRecorded.current = true
    setLastVisitAt(new Date().toISOString())
  }, [setLastVisitAt])

  const snapshot = useMemo(() => ({ assets, liabilities, profile: profile! }), [assets, liabilities, profile])
  const report = useMemo(() => diagnose(snapshot, { locale }), [snapshot, locale])
  const breakdown = useMemo(() => categoryBreakdown(assets), [assets])
  const totalNW = useMemo(() => netWorth(snapshot), [snapshot])

  // 每次进入总览自动记录一条诊断快照（同一天内去重替换）
  useEffect(() => {
    if (!profile || assets.length === 0) return
    addSnapshot({
      date: new Date().toISOString(),
      overallScore: report.overallScore,
      grade: report.grade,
      gradeLabel: L.grade[report.grade],
      netWorth: totalNW,
      totalAssets: assets.reduce((s, a) => s + a.marketValue, 0),
      totalLiabilities: liabilities.reduce((s, l) => s + l.remainingPrincipal, 0),
      qualitativeScore: report.qualitativeScore,
      quantitativeScore: report.quantitativeScore,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 只在数据/报告变化时记录
  }, [report, totalNW])
  const em = useMemo(() => emergencyMonths(snapshot), [snapshot])
  const dti = useMemo(() => debtToIncome(snapshot), [snapshot])
  const lev = useMemo(() => leverageRatio(snapshot), [snapshot])
  const lr = useMemo(() => liquidityRatio(assets), [assets])

  const allocationData = ASSET_CATEGORY_ORDER
    .filter((cat) => breakdown[cat] > 0)
    .map((cat) => ({
      name: L.category[cat],
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
      { name: locale === 'en' ? 'Spending' : '要花的钱', value: alloc.shortTerm },
      { name: locale === 'en' ? 'Protection' : '保命的钱', value: alloc.protection },
      { name: locale === 'en' ? 'Growth' : '生钱的钱', value: alloc.growth },
      { name: locale === 'en' ? 'Stability' : '保本升值', value: alloc.stable },
    ]
  }, [assets, locale])

  const quadrantOption = {
    radar: {
      indicator: [
        { name: t('dashboard.quadrant.shortTerm'), max: 0.6 },
        { name: t('dashboard.quadrant.protection'), max: 0.6 },
        { name: t('dashboard.quadrant.growth'), max: 0.6 },
        { name: t('dashboard.quadrant.stable'), max: 0.6 },
      ],
      center: ['50%', '55%'],
      radius: '70%',
    },
    series: [{
      type: 'radar',
      data: [{
        value: quadrantData.map((d) => d.value),
        name: t('dashboard.quadrant.current'),
        areaStyle: { color: 'rgba(30, 94, 255, 0.15)' },
        lineStyle: { color: '#1E5EFF', width: 2 },
        itemStyle: { color: '#1E5EFF' },
      }, {
        value: [0.10, 0.20, 0.30, 0.40],
        name: t('dashboard.quadrant.target'),
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

  const trendOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: [t('dashboard.netWorth'), t('dashboard.overallScore')] },
    grid: { left: 60, right: 50, top: 36, bottom: 28 },
    xAxis: {
      type: 'category',
      data: snapshots.map((s) => s.date.slice(5, 10)),
    },
    yAxis: [
      { type: 'value', name: t('dashboard.netWorth'), axisLabel: { formatter: (v: number) => `${(v / 10000).toFixed(0)}万` } },
      { type: 'value', name: '评分', min: 0, max: 100 },
    ],
    series: [
      {
        name: t('dashboard.netWorth'), type: 'line', smooth: true,
        data: snapshots.map((s) => s.netWorth),
        itemStyle: { color: '#1E5EFF' },
        areaStyle: { color: 'rgba(30, 94, 255, 0.08)' },
      },
      {
        name: t('dashboard.overallScore'), type: 'line', smooth: true, yAxisIndex: 1,
        data: snapshots.map((s) => s.overallScore),
        itemStyle: { color: gradeColor },
      },
    ],
  }

  if (!profile) return <Empty description={t('dashboard.pleaseOnboard')} />

  return (
    <div>
      <DisclaimerBanner compact />
      {daysSinceVisit >= REASSESS_REMINDER_DAYS && (
        <Alert
          type="info"
          showIcon
          icon={<ReloadOutlined />}
          message={t('dashboard.reassess.title', { days: daysSinceVisit })}
          description={t('dashboard.reassess.desc')}
          action={
            <Button size="small" type="primary" onClick={() => navigate('/report')}>
              {t('dashboard.reassess.action')}
            </Button>
          }
          style={{ marginBottom: 16 }}
        />
      )}
      <Row gutter={[16, 16]}>
        {/* Hero: Net Worth + Grade */}
        <Col span={24}>
          <Card>
            <Row align="middle" justify="space-between" wrap>
              <Col>
                <Text type="secondary">{t('dashboard.netWorth')}</Text>
                <Title level={2} style={{ margin: '4px 0 0' }}>
                  {formatCNY(totalNW)}
                </Title>
                <Space>
                  <Text type="secondary">{t('dashboard.totalAssets')} {formatCNY(assets.reduce((s, a) => s + a.marketValue, 0))}</Text>
                  <Text type="secondary">| {t('dashboard.totalLiabilities')} {formatCNY(liabilities.reduce((s, l) => s + l.remainingPrincipal, 0))}</Text>
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
                  <Text style={{ fontSize: 11, color: gradeColor }}>{L.grade[report.grade]}</Text>
                </div>
                <Text style={{ fontSize: 12, color: '#999', display: 'block', marginTop: 4 }}>
                  {t('dashboard.overallScore')} {report.overallScore}
                </Text>
              </Col>
            </Row>
          </Card>
        </Col>

        {/* KPI Cards */}
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic title={t('dashboard.emergency')} value={em.toFixed(1)} suffix={t('dashboard.emergency.suffix')}
              valueStyle={{ color: em >= 6 ? '#52c41a' : em >= 3 ? '#faad14' : '#ff4d4f' }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic title={t('dashboard.dti')} value={(dti * 100).toFixed(1)} suffix="%"
              valueStyle={{ color: dti <= 0.4 ? '#52c41a' : dti <= 0.5 ? '#faad14' : '#ff4d4f' }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic title={t('dashboard.leverage')} value={(lev * 100).toFixed(1)} suffix="%"
              valueStyle={{ color: lev <= 0.4 ? '#52c41a' : lev <= 0.6 ? '#faad14' : '#ff4d4f' }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic title={t('dashboard.liquidity')} value={(lr * 100).toFixed(1)} suffix="%"
              valueStyle={{ color: lr >= 0.15 ? '#52c41a' : lr >= 0.08 ? '#faad14' : '#ff4d4f' }} />
          </Card>
        </Col>

        {/* Net Worth & Score Trend */}
        {snapshots.length >= 2 && (
          <Col span={24}>
            <Card title={t('dashboard.trend')}>
              <ReactECharts option={trendOption} style={{ height: 240 }} />
            </Card>
          </Col>
        )}

        {/* Allocation Donut */}
        <Col xs={24} md={12}>
          <Card title={t('dashboard.allocation')}>
            {allocationData.length > 0 ? (
              <ReactECharts option={allocationOption} style={{ height: 320 }} />
            ) : <Empty description={t('dashboard.noData')} />}
          </Card>
        </Col>

        {/* Quadrant Radar */}
        <Col xs={24} md={12}>
          <Card title={t('dashboard.quadrant')}>
            <ReactECharts option={quadrantOption} style={{ height: 320 }} />
          </Card>
        </Col>

        {/* Critical Alerts */}
        <Col span={24}>
          <Card
            title={<Space><WarningOutlined style={{ color: '#ff4d4f' }} />{t('dashboard.alerts')}</Space>}
            extra={<Button type="link" onClick={() => navigate('/report')}>{t('dashboard.viewReport')}</Button>}
          >
            {report.checks.filter((c) => c.status === 'fail').slice(0, 3).length === 0 ? (
              <Text type="secondary">{t('dashboard.alertsNone')}</Text>
            ) : (
              report.checks.filter((c) => c.status === 'fail').slice(0, 3).map((c) => (
                <Card key={c.id} size="small" style={{ marginBottom: 8 }} type="inner">
                  <Space>
                    {statusIcon(c.status)}
                    <Text strong>{c.name}</Text>
                    <Tag color={c.severity === 'critical' ? 'red' : c.severity === 'high' ? 'orange' : 'blue'}>
                      {L.severity[c.severity]}
                    </Tag>
                  </Space>
                  <br />
                  <Text type="secondary" style={{ fontSize: 13 }}>{c.description}</Text>
                </Card>
              ))
            )}
            {report.checks.filter((c) => c.status === 'fail').length > 3 && (
              <Text type="secondary">{t('dashboard.moreFails', { count: report.checks.filter((c) => c.status === 'fail').length - 3 })}</Text>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}
