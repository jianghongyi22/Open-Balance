import { useMemo, useState } from 'react'
import {
  Row, Col, Card, Slider, Typography, Space, Tag, Statistic, Button, Empty,
} from 'antd'
import ReactECharts from 'echarts-for-react'
import { useStore } from '../store'
import { useI18n } from '../i18n'
import { runScenario, getScenarioPresets } from '../scenario'
import type { ScenarioShocks } from '../types'
import DisclaimerBanner from '../components/DisclaimerBanner'

const { Title, Text, Paragraph } = Typography

export default function ScenarioLab() {
  const { assets, liabilities, profile } = useStore()
  const { t, locale, L } = useI18n()
  const presets = getScenarioPresets(locale)
  const [shocks, setShocks] = useState<ScenarioShocks>({
    stockMarketPct: -10,
    propertyMarketPct: -5,
    interestRateBps: 0,
    fxRatePct: 0,
    incomeInterruptionMonths: 0,
  })

  const snapshot = useMemo(() => ({ assets, liabilities, profile: profile! }), [assets, liabilities, profile])
  const scenario = useMemo(
    () => runScenario(snapshot, shocks, locale === 'en' ? 'custom scenario' : '自定义情景', locale),
    [snapshot, shocks, locale]
  )

  const handlePreset = (preset: (typeof presets)[0]) => {
    setShocks(preset.shocks)
  }

  if (!profile) return <Empty description={t('dashboard.pleaseOnboard')} />

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
    yAxis: { type: 'value', name: t('scenario.axisScoreChange') },
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
      <DisclaimerBanner compact />
      <Title level={4}>{t('scenario.title')}</Title>
      <Paragraph type="secondary">
        {t('scenario.desc')}
      </Paragraph>

      {/* Presets */}
      <Card title={t('scenario.presets')} size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          {presets.map((preset) => (
            <Button key={preset.name} size="small" onClick={() => handlePreset(preset)}>
              {preset.name}
            </Button>
          ))}
        </Space>
      </Card>

      {/* Sliders */}
      <Card title={t('scenario.custom')} size="small" style={{ marginBottom: 16 }}>
        <Row gutter={[24, 8]}>
          <Col xs={24} md={12}>
            <Text>{t('scenario.stock')}: {shocks.stockMarketPct > 0 ? '+' : ''}{shocks.stockMarketPct}%</Text>
            <Slider min={-30} max={30} step={1} value={shocks.stockMarketPct}
              onChange={(v) => setShocks({ ...shocks, stockMarketPct: v })}
              marks={{ '-30': '-30%', 0: '0%', 30: '+30%' }} />
          </Col>
          <Col xs={24} md={12}>
            <Text>{t('scenario.property')}: {shocks.propertyMarketPct > 0 ? '+' : ''}{shocks.propertyMarketPct}%</Text>
            <Slider min={-20} max={10} step={1} value={shocks.propertyMarketPct}
              onChange={(v) => setShocks({ ...shocks, propertyMarketPct: v })}
              marks={{ '-20': '-20%', 0: '0%', 10: '+10%' }} />
          </Col>
          <Col xs={24} md={12}>
            <Text>{t('scenario.rates')}: {shocks.interestRateBps > 0 ? '+' : ''}{shocks.interestRateBps} bp</Text>
            <Slider min={-200} max={200} step={25} value={shocks.interestRateBps}
              onChange={(v) => setShocks({ ...shocks, interestRateBps: v })}
              marks={{ '-200': '-200', 0: '0', 200: '+200' }} />
          </Col>
          <Col xs={24} md={12}>
            <Text>{t('scenario.fx')}: {shocks.fxRatePct > 0 ? '+' : ''}{shocks.fxRatePct}%</Text>
            <Slider min={-10} max={10} step={1} value={shocks.fxRatePct}
              onChange={(v) => setShocks({ ...shocks, fxRatePct: v })}
              marks={{ '-10': '-10%', 0: '0%', 10: '+10%' }} />
          </Col>
          <Col xs={24} md={12}>
            <Text>{t('scenario.incomeBreak')}: {shocks.incomeInterruptionMonths} {t('scenario.months')}</Text>
            <Slider min={0} max={12} step={1} value={shocks.incomeInterruptionMonths}
              onChange={(v) => setShocks({ ...shocks, incomeInterruptionMonths: v })}
              marks={{ 0: '0', 6: `6${t('scenario.months')}`, 12: `12${t('scenario.months')}` }} />
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
                <Statistic title={t('scenario.baseline')} value={scenario.baselineReport.overallScore}
                  suffix={<Text>{t('scenario.gradeSuffix', { grade: scenario.baselineReport.grade })}</Text>} />
              </Col>
              <Col>
                <Text style={{ fontSize: 24, margin: '0 16px' }}>→</Text>
              </Col>
              <Col>
                <Statistic
                  title={t('scenario.shocked')}
                  value={scenario.shockedReport.overallScore}
                  suffix={<Text>{t('scenario.gradeSuffix', { grade: scenario.shockedReport.grade })}</Text>}
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
                  {t('scenario.scorePoints', { diff: `${scenario.scoreDiff > 0 ? '+' : ''}${scenario.scoreDiff}` })}
                  {scenario.gradeChange ? t('scenario.gradeChanged', { change: scenario.gradeChange }) : ''}
                </Tag>
              </Col>
            </Row>
          </Card>
        </Col>

        {/* Waterfall */}
        <Col xs={24} lg={14}>
          <Card title={t('scenario.waterfall')}>
            {waterfallData.length > 0 ? (
              <ReactECharts option={waterfallOption} style={{ height: 400 }} />
            ) : (
              <Empty description={t('scenario.noChanges')} />
            )}
          </Card>
        </Col>

        {/* Status Changes */}
        <Col xs={24} lg={10}>
          <Card title={t('scenario.details')}>
            {scenario.checkDiffs
              .filter((d) => d.baselineStatus !== d.shockedStatus)
              .map((d) => (
                <Card key={d.checkId} size="small" style={{ marginBottom: 8 }}>
                  <Space>
                    <Text strong>{d.checkName}</Text>
                    <Tag>{L.status[d.baselineStatus]}</Tag>
                    <Text>→</Text>
                    <Tag color={d.shockedStatus === 'fail' ? 'red' : d.shockedStatus === 'warn' ? 'gold' : 'green'}>
                      {L.status[d.shockedStatus]}
                    </Tag>
                    <Text type={d.scoreDiff < 0 ? 'danger' : 'success'}>
                      ({t('scenario.scorePoints', { diff: `${d.scoreDiff > 0 ? '+' : ''}${d.scoreDiff}` })})
                    </Text>
                  </Space>
                </Card>
              ))}
            {scenario.checkDiffs.filter((d) => d.baselineStatus !== d.shockedStatus).length === 0 && (
              <Empty description={t('scenario.noStatusChanges')} />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}
