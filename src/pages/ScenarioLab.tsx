import { useMemo, useState } from 'react'
import {
  Row, Col, Card, Slider, Typography, Space, Tag, Statistic, Button, Empty, Divider, Descriptions,
} from 'antd'
import { ExperimentOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { useStore } from '../store'
import { applyShocks, runScenario, SCENARIO_PRESETS } from '../scenario'
import { diagnose } from '../engine'
import type { ScenarioShocks, ScenarioResult, CheckStatus } from '../types'
import { CHECK_STATUS_LABELS } from '../types'

const { Title, Text, Paragraph } = Typography

const STATUS_ORDER: CheckStatus[] = ['fail', 'warn', 'pass']

export default function ScenarioLab() {
  const { assets, liabilities, profile } = useStore()
  const [shocks, setShocks] = useState<ScenarioShocks>({
    stockMarketPct: -10,
    propertyMarketPct: -5,
    interestRateBps: 0,
    fxRatePct: 0,
    incomeInterruptionMonths: 0,
  })

  const snapshot = useMemo(() => ({ assets, liabilities, profile: profile! }), [assets, liabilities, profile])
  const baselineReport = useMemo(() => diagnose(snapshot), [snapshot])
  const scenario = useMemo(
    () => runScenario(snapshot, shocks, '自定义情景'),
    [snapshot, shocks]
  )

  const handlePreset = (preset: typeof SCENARIO_PRESETS[0]) => {
    setShocks(preset.shocks)
  }

  if (!profile) return <Empty description="请先完成引导" />

  const waterfallData = scenario.checkDiffs
    .filter((d) => d.scoreDiff !== 0)
    .sort((a, b) => a.scoreDiff - b.scoreDiff)

  const waterfallOption = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: {
      type: 'category',
      data: waterfallData.map((d) => d.checkName),
      axisLabel: { interval: 0, rotate: 45, fontSize: 10 },
    },
    yAxis: { type: 'value', name: '分数变化' },
    series: [{
      type: 'bar',
      data: waterfallData.map((d) => ({
        value: d.scoreDiff,
        itemStyle: {
          color: d.scoreDiff < 0 ? '#ff4d4f' : d.scoreDiff > 0 ? '#52c41a' : '#999',
        },
      })),
      label: { show: true, position: 'outside', formatter: '{c}' },
    }],
    grid: { bottom: 100 },
  }

  return (
    <div>
      <Title level={4}>情景分析实验室</Title>
      <Paragraph type="secondary">
        通过调整市场参数模拟不同经济情景下您的资产表现，帮助您了解组合的脆弱点和韧性
      </Paragraph>

      {/* Presets */}
      <Card title="预设情景" size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          {SCENARIO_PRESETS.map((preset) => (
            <Button key={preset.name} size="small" onClick={() => handlePreset(preset)}>
              {preset.name}
            </Button>
          ))}
        </Space>
      </Card>

      {/* Sliders */}
      <Card title="自定义参数" size="small" style={{ marginBottom: 16 }}>
        <Row gutter={[24, 8]}>
          <Col span={12}>
            <Text>股市涨跌: {shocks.stockMarketPct > 0 ? '+' : ''}{shocks.stockMarketPct}%</Text>
            <Slider min={-30} max={30} step={1} value={shocks.stockMarketPct}
              onChange={(v) => setShocks({ ...shocks, stockMarketPct: v })}
              marks={{ '-30': '-30%', 0: '0%', 30: '+30%' }} />
          </Col>
          <Col span={12}>
            <Text>房价涨跌: {shocks.propertyMarketPct > 0 ? '+' : ''}{shocks.propertyMarketPct}%</Text>
            <Slider min={-20} max={10} step={1} value={shocks.propertyMarketPct}
              onChange={(v) => setShocks({ ...shocks, propertyMarketPct: v })}
              marks={{ '-20': '-20%', 0: '0%', 10: '+10%' }} />
          </Col>
          <Col span={12}>
            <Text>利率变化: {shocks.interestRateBps > 0 ? '+' : ''}{shocks.interestRateBps} bp</Text>
            <Slider min={-200} max={200} step={25} value={shocks.interestRateBps}
              onChange={(v) => setShocks({ ...shocks, interestRateBps: v })}
              marks={{ '-200': '-200', 0: '0', 200: '+200' }} />
          </Col>
          <Col span={12}>
            <Text>汇率变动: {shocks.fxRatePct > 0 ? '+' : ''}{shocks.fxRatePct}%</Text>
            <Slider min={-10} max={10} step={1} value={shocks.fxRatePct}
              onChange={(v) => setShocks({ ...shocks, fxRatePct: v })}
              marks={{ '-10': '-10%', 0: '0%', 10: '+10%' }} />
          </Col>
          <Col span={12}>
            <Text>收入中断: {shocks.incomeInterruptionMonths} 个月</Text>
            <Slider min={0} max={12} step={1} value={shocks.incomeInterruptionMonths}
              onChange={(v) => setShocks({ ...shocks, incomeInterruptionMonths: v })}
              marks={{ 0: '0', 6: '6月', 12: '12月' }} />
          </Col>
        </Row>
      </Card>

      {/* Results */}
      <Row gutter={[16, 16]}>
        {/* Score Comparison */}
        <Col span={24}>
          <Card>
            <Row gutter={24} align="middle">
              <Col>
                <Statistic title="基准评分" value={scenario.baselineReport.overallScore}
                  suffix={<Text>({scenario.baselineReport.grade}级)</Text>} />
              </Col>
              <Col>
                <Text style={{ fontSize: 24, margin: '0 16px' }}>→</Text>
              </Col>
              <Col>
                <Statistic
                  title="情景评分"
                  value={scenario.shockedReport.overallScore}
                  suffix={<Text>({scenario.shockedReport.grade}级)</Text>}
                  valueStyle={{
                    color: scenario.scoreDiff < 0 ? '#ff4d4f' : scenario.scoreDiff > 0 ? '#52c41a' : '#000',
                  }}
                />
              </Col>
              <Col>
                <Tag
                  color={scenario.scoreDiff < 0 ? 'red' : scenario.scoreDiff > 0 ? 'green' : 'default'}
                  style={{ fontSize: 16, padding: '4px 12px' }}
                >
                  {scenario.scoreDiff > 0 ? '+' : ''}{scenario.scoreDiff} 分
                  {scenario.gradeChange ? ` · 等级 ${scenario.gradeChange}` : ''}
                </Tag>
              </Col>
            </Row>
          </Card>
        </Col>

        {/* Waterfall */}
        <Col xs={24} lg={14}>
          <Card title="各检查项分数变化（瀑布图）">
            {waterfallData.length > 0 ? (
              <ReactECharts option={waterfallOption} style={{ height: 400 }} />
            ) : (
              <Empty description="该情景下所有检查项未发生变化" />
            )}
          </Card>
        </Col>

        {/* Status Changes */}
        <Col xs={24} lg={10}>
          <Card title="状态变化明细">
            {scenario.checkDiffs
              .filter((d) => d.baselineStatus !== d.shockedStatus)
              .map((d) => (
                <Card key={d.checkId} size="small" style={{ marginBottom: 8 }}>
                  <Space>
                    <Text strong>{d.checkName}</Text>
                    <Tag>{CHECK_STATUS_LABELS[d.baselineStatus]}</Tag>
                    <Text>→</Text>
                    <Tag color={d.shockedStatus === 'fail' ? 'red' : d.shockedStatus === 'warn' ? 'gold' : 'green'}>
                      {CHECK_STATUS_LABELS[d.shockedStatus]}
                    </Tag>
                    <Text type={d.scoreDiff < 0 ? 'danger' : 'success'}>
                      ({d.scoreDiff > 0 ? '+' : ''}{d.scoreDiff}分)
                    </Text>
                  </Space>
                </Card>
              ))}
            {scenario.checkDiffs.filter((d) => d.baselineStatus !== d.shockedStatus).length === 0 && (
              <Empty description="无状态变化" />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}
