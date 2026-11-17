import { useMemo, useState } from 'react'
import { Card, Typography, Tag, Space, Checkbox, Empty, Collapse, Timeline } from 'antd'
import { ClockCircleOutlined, CalendarOutlined, FieldTimeOutlined } from '@ant-design/icons'
import { useStore } from '../store'
import { useI18n } from '../i18n'
import { diagnose, generateRecommendations } from '../engine'

import type { Urgency } from '../types'

const { Title, Text, Paragraph } = Typography

const urgencyConfig: Record<Urgency, { color: string; icon: React.ReactNode }> = {
  immediate: { color: 'red', icon: <ClockCircleOutlined /> },
  this_month: { color: 'orange', icon: <CalendarOutlined /> },
  this_quarter: { color: 'blue', icon: <FieldTimeOutlined /> },
}

export default function Recommendations() {
  const { assets, liabilities, profile } = useStore()
  const { t, locale, L } = useI18n()
  const [checked, setChecked] = useState<Set<string>>(new Set())

  const snapshot = useMemo(() => ({ assets, liabilities, profile: profile! }), [assets, liabilities, profile])
  const report = useMemo(() => diagnose(snapshot, { locale }), [snapshot, locale])
  const recs = useMemo(() => generateRecommendations(snapshot, report.checks, locale), [snapshot, report, locale])

  if (!profile) return <Empty description={t('dashboard.pleaseOnboard')} />

  const immediate = recs.filter((r) => r.urgency === 'immediate')
  const thisMonth = recs.filter((r) => r.urgency === 'this_month')
  const thisQuarter = recs.filter((r) => r.urgency === 'this_quarter')

  const toggleCheck = (id: string) => {
    const next = new Set(checked)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setChecked(next)
  }

  const totalRecs = recs.length
  const completed = recs.filter((r) => checked.has(r.id)).length

  const renderRecCard = (rec: typeof recs[0]) => {
    const config = urgencyConfig[rec.urgency]
    const triggeringCheck = report.checks.find((c) => c.id === rec.checkRef)

    return (
      <Card
        key={rec.id}
        size="small"
        style={{ marginBottom: 12 }}
        title={
          <Space>
            <Checkbox checked={checked.has(rec.id)} onChange={() => toggleCheck(rec.id)} />
            <Tag color={config.color} icon={config.icon}>{L.urgency[rec.urgency]}</Tag>
            <Text strong style={{ textDecoration: checked.has(rec.id) ? 'line-through' : 'none' }}>
              {rec.title}
            </Text>
          </Space>
        }
      >
        <Paragraph style={{ marginBottom: 8 }}>{rec.description}</Paragraph>
        <Space wrap>
          <Tag>{t('recs.trigger', { check: rec.checkRef, name: triggeringCheck?.name ?? '' })}</Tag>
          <Tag>{t('recs.status', { status: triggeringCheck ? L.status[triggeringCheck.status] : '—' })}</Tag>
          <Tag>{t('recs.effort', { effort: rec.effort })}</Tag>
        </Space>
        <Paragraph type="secondary" style={{ marginTop: 8, fontSize: 13 }}>
          {t('recs.effect', { effect: rec.expectedEffect })}
        </Paragraph>
        <Collapse size="small" ghost items={[{
          key: 'steps',
          label: t('recs.steps', { count: rec.steps.length }),
          children: (
            <Timeline items={rec.steps.map((s, i) => ({ children: s, color: i === 0 ? 'blue' : 'gray' }))} />
          ),
        }]} />
      </Card>
    )
  }

  return (
    <div>
      <Title level={4}>{t('recs.title')}</Title>
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space>
          <Text>{t('recs.progress')}</Text>
          <Text strong>{t('recs.done', { done: completed, total: totalRecs })}</Text>
        </Space>
      </Card>

      {recs.length === 0 ? (
        <Card><Empty description={t('recs.none')} /></Card>
      ) : (
        <>
          {immediate.length > 0 && (
            <Card
              title={<Space><ClockCircleOutlined style={{ color: '#ff4d4f' }} /><Text strong style={{ color: '#ff4d4f' }}>立即处理 ({immediate.length}项)</Text></Space>}
              style={{ marginBottom: 16, borderColor: '#ffccc7' }}
            >
              {immediate.map(renderRecCard)}
            </Card>
          )}

          {thisMonth.length > 0 && (
            <Card
              title={<Space><CalendarOutlined style={{ color: '#faad14' }} /><Text strong style={{ color: '#faad14' }}>本月内 ({thisMonth.length}项)</Text></Space>}
              style={{ marginBottom: 16, borderColor: '#ffe58f' }}
            >
              {thisMonth.map(renderRecCard)}
            </Card>
          )}

          {thisQuarter.length > 0 && (
            <Card
              title={<Space><FieldTimeOutlined style={{ color: '#1890ff' }} /><Text strong style={{ color: '#1890ff' }}>本季度内 ({thisQuarter.length}项)</Text></Space>}
              style={{ borderColor: '#91caff' }}
            >
              {thisQuarter.map(renderRecCard)}
            </Card>
          )}
        </>
      )}
    </div>
  )
}
