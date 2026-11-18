import { useMemo } from 'react'
import { Row, Col, Card, Typography, Tag, Progress, Empty, Collapse, Space, Statistic, Descriptions, Button } from 'antd'
import {
  CheckCircleOutlined, ExclamationCircleOutlined, CloseCircleOutlined,
  TrophyOutlined, WarningOutlined, PrinterOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { useStore } from '../store'
import { useI18n } from '../i18n'
import { diagnose } from '../engine'

import type { CheckResult, CheckStatus } from '../types'
import { netWorth } from '../engine/metrics'
import { formatCNY } from '../utils/format'
import DisclaimerBanner from '../components/DisclaimerBanner'

const { Title, Text, Paragraph } = Typography

export default function Report() {
  const { assets, liabilities, profile, snapshots } = useStore()
  const { t, locale, L } = useI18n()

  const snapshot = useMemo(() => ({ assets, liabilities, profile: profile! }), [assets, liabilities, profile])
  const report = useMemo(() => diagnose(snapshot, { locale }), [snapshot, locale])
  const totalNW = useMemo(() => netWorth(snapshot), [snapshot])

  if (!profile) return <Empty description={t('dashboard.pleaseOnboard')} />

  // 与上次诊断对比：取最近一条非今日快照
  const todayStr = new Date().toISOString().slice(0, 10)
  const prevSnapshot = [...snapshots]
    .reverse()
    .find((s) => s.date.slice(0, 10) !== todayStr)
  const scoreDelta = prevSnapshot ? report.overallScore - prevSnapshot.overallScore : null

  const gradeColor =
    report.grade === 'A' ? '#52c41a' :
    report.grade === 'B' ? '#1890ff' :
    report.grade === 'C' ? '#faad14' : '#ff4d4f'

  const statusIcon = (status: CheckStatus) => {
    switch (status) {
      case 'pass': return <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 18 }} />
      case 'warn': return <ExclamationCircleOutlined style={{ color: '#faad14', fontSize: 18 }} />
      case 'fail': return <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 18 }} />
    }
  }

  const gaugeOption = {
    series: [{
      type: 'gauge',
      startAngle: 210, endAngle: -30,
      center: ['50%', '60%'],
      radius: '90%',
      min: 0, max: 100,
      splitNumber: 10,
      axisLine: {
        show: true,
        lineStyle: {
          width: 20,
          color: [
            [0.55, '#ff4d4f'], [0.70, '#faad14'], [0.85, '#1890ff'], [1, '#52c41a'],
          ],
        },
      },
      pointer: { length: '60%', width: 6, itemStyle: { color: 'auto' } },
      detail: {
        valueAnimation: true,
        formatter: '{value}',
        fontSize: 28,
        offsetCenter: [0, '80%'],
      },
      data: [{ value: report.overallScore, name: '综合评分' }],
    }],
  }

  const scoreBarOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['定性得分', '定量得分'] },
    xAxis: { type: 'value', max: 100 },
    yAxis: { type: 'category', data: ['定性诊断 (8项)', '定量诊断 (8项)'] },
    series: [
      {
        name: '得分', type: 'bar',
        data: [
          { value: report.qualitativeScore, itemStyle: { color: report.qualitativeScore >= 70 ? '#1890ff' : report.qualitativeScore >= 55 ? '#faad14' : '#ff4d4f' } },
          { value: report.quantitativeScore, itemStyle: { color: report.quantitativeScore >= 70 ? '#1890ff' : report.quantitativeScore >= 55 ? '#faad14' : '#ff4d4f' } },
        ],
        label: { show: true, position: 'right', formatter: '{c}分' },
      },
    ],
  }

  const qualChecks = report.checks.filter((c) => c.layer === 'qualitative')
  const quantChecks = report.checks.filter((c) => c.layer === 'quantitative')

  const renderCheckCard = (check: CheckResult) => (
    <Card
      key={check.id}
      size="small"
      style={{ marginBottom: 8 }}
      title={
        <Space>
          {statusIcon(check.status)}
          <Text strong>{check.id} {check.name}</Text>
          <Tag color={check.severity === 'critical' ? 'red' : check.severity === 'high' ? 'orange' : check.severity === 'medium' ? 'blue' : 'default'}>
            {L.severity[check.severity]}
          </Tag>
          <Tag color={check.status === 'pass' ? 'green' : check.status === 'warn' ? 'gold' : 'red'}>
            {L.status[check.status]}
          </Tag>
          <Tag color={check.evidenceLevel === 'regulatory' ? 'purple' : check.evidenceLevel === 'research' ? 'cyan' : 'default'}>
            {L.evidence[check.evidenceLevel]}
          </Tag>
          {report.criticalChecks.includes(check.id) && (
            <Tag color="red">{t('report.criticalTag')}</Tag>
          )}
          {report.crossValidationOverrides.includes(check.id) && (
            <Tag color="orange">{t('report.crossValidationTag')}</Tag>
          )}
        </Space>
      }
    >
      <Paragraph type="secondary" style={{ marginBottom: 8 }}>{check.description}</Paragraph>
      <Descriptions size="small" column={{ xs: 1, sm: 2 }}>
        <Descriptions.Item label={t('report.framework')}>{check.framework || '—'}</Descriptions.Item>
        <Descriptions.Item label={t('report.measured')}>{check.measuredLabel}{check.layer === 'quantitative' && check.id !== 'Q15' ? t('report.estimated') : ''}</Descriptions.Item>
        <Descriptions.Item label={t('report.threshold')} span={2}>{check.threshold}</Descriptions.Item>
        {check.rangeValue && (
          <Descriptions.Item label={t('report.range')} span={2}>
            {check.rangeValue.low >= 99
              ? t('report.sufficient')
              : `${(check.rangeValue.low * 100).toFixed(0)}%`}
            {' ~ '}
            {check.rangeValue.high >= 99
              ? t('report.sufficient')
              : `${(check.rangeValue.high * 100).toFixed(0)}%`}
            {t('report.range.scenarios')}
          </Descriptions.Item>
        )}
      </Descriptions>
      <Collapse
        size="small"
        ghost
        items={[{
          key: 'detail',
          label: t('report.detail'),
          children: <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, margin: 0 }}>{check.detail}</pre>,
        }]}
      />
    </Card>
  )

  return (
    <div>
      {/* 常驻免责声明 */}
      <DisclaimerBanner />

      {/* 打印工具行（打印时隐藏） */}
      <Space className="print-hide" style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
          {t('report.print')}
        </Button>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {t('report.generatedAt', { time: new Date(report.generatedAt).toLocaleString(locale === 'en' ? 'en-US' : 'zh-CN') })}
          {scoreDelta !== null && prevSnapshot && (
            <Text style={{ marginLeft: 12 }}>
              {t('report.vsPrevious', { date: prevSnapshot.date.slice(0, 10) })}
              <Text
                strong
                style={{
                  color: scoreDelta > 0 ? '#52c41a' : scoreDelta < 0 ? '#ff4d4f' : 'inherit',
                  marginLeft: 4,
                }}
              >
                {scoreDelta > 0 ? '+' : ''}{scoreDelta} 分
              </Text>
            </Text>
          )}
          {' · '}{t('report.eduNote')}
        </Text>
      </Space>

      {/* Grade Banner */}
      <Card
        style={{
          marginBottom: 16,
          background: `linear-gradient(135deg, ${gradeColor}15, ${gradeColor}05)`,
          borderLeft: `4px solid ${gradeColor}`,
        }}
      >
        <Row align="middle" justify="space-between">
          <Col>
            <Space>
              <TrophyOutlined style={{ fontSize: 32, color: gradeColor }} />
              <div>
                <Title level={3} style={{ margin: 0, color: gradeColor }}>
                  {t('report.grade', { grade: report.grade, label: L.grade[report.grade] })}
                  <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                    {t('report.gradeNote')}
                  </Text>
                </Title>
                <Text type="secondary">
                  {t('report.scores', { overall: report.overallScore, qual: report.qualitativeScore, quant: report.quantitativeScore })}
                </Text>
                {report.criticalFlag && (
                  <div style={{ marginTop: 4 }}>
                    <Tag color="red" icon={<WarningOutlined />}>
                      {t('report.criticalFlag', { checks: report.criticalChecks.join(', ') })}
                    </Tag>
                  </div>
                )}
              </div>
            </Space>
          </Col>
          <Col>
            <Statistic title={t('dashboard.netWorth')} value={formatCNY(totalNW)} />
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        {/* Gauge */}
        <Col xs={24} md={8}>
          <Card>
            <ReactECharts option={gaugeOption} style={{ height: 280 }} />
          </Card>
        </Col>

        {/* Dimension Scores */}
        <Col xs={24} md={8}>
          <Card title={t('report.dimensions')}>
            <ReactECharts option={scoreBarOption} style={{ height: 280 }} />
          </Card>
        </Col>

        {/* Summary */}
        <Col xs={24} md={8}>
          <Card title={t('report.overview')}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Space><CheckCircleOutlined style={{ color: '#52c41a' }} /><Text>{t('report.pass')}</Text></Space>
                <Progress percent={Math.round(report.checks.filter(c => c.status === 'pass').length / 16 * 100)}
                  strokeColor="#52c41a" size="small" />
              </div>
              <div>
                <Space><ExclamationCircleOutlined style={{ color: '#faad14' }} /><Text>{t('report.warn')}</Text></Space>
                <Progress percent={Math.round(report.checks.filter(c => c.status === 'warn').length / 16 * 100)}
                  strokeColor="#faad14" size="small" />
              </div>
              <div>
                <Space><CloseCircleOutlined style={{ color: '#ff4d4f' }} /><Text>{t('report.fail')}</Text></Space>
                <Progress percent={Math.round(report.checks.filter(c => c.status === 'fail').length / 16 * 100)}
                  strokeColor="#ff4d4f" size="small" />
              </div>
            </Space>
          </Card>
        </Col>

        {/* Qualitative Checks */}
        <Col xs={24} lg={12}>
          <Card title={t('report.dimension.qual', { count: 8 })} style={{ background: '#fafafa' }}>
            {qualChecks.map(renderCheckCard)}
          </Card>
        </Col>

        {/* Quantitative Checks */}
        <Col xs={24} lg={12}>
          <Card title={t('report.dimension.quant', { count: 9 })} style={{ background: '#fafafa' }}>
            {quantChecks.map(renderCheckCard)}
          </Card>
        </Col>
      </Row>
    </div>
  )
}
