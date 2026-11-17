import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Steps, Button, Card, Form, InputNumber, Select, Radio, Space,
  Result, Typography, message, Divider,
} from 'antd'
import { CheckCircleOutlined } from '@ant-design/icons'
import { useStore } from '../store'
import { useI18n } from '../i18n'
import { getRiskQuestions, normalizeRiskScore, getRiskProfile } from '../data/riskQuestionnaire'
import type { HouseholdProfile } from '../types'

const { Title, Text, Paragraph } = Typography

export default function Onboarding() {
  const [step, setStep] = useState(0)
  const [form] = Form.useForm()
  const [riskAnswers, setRiskAnswers] = useState<Record<number, number>>({})
  const navigate = useNavigate()
  const { setProfile, loadSampleData, completeOnboarding } = useStore()
  const { t, locale } = useI18n()
  const riskQuestions = getRiskQuestions(locale)

  const handleNext = async () => {
    if (step === 0) {
      try {
        const values = await form.validateFields()
        const profile: HouseholdProfile = {
          memberAges: [values.age1, values.age2].filter((a: number) => a > 0),
          dependentCount: values.dependentCount ?? 0,
          dependentAges: values.dependentAges ? [values.dependentAges] : [],
          annualIncome: values.annualIncome,
          monthlyEssentialExpense: values.monthlyEssentialExpense,
          incomeStability: values.incomeStability ?? 'stable',
          riskToleranceScore: 50,
          retirementAge: 60,
          monthlySocialPension: values.monthlySocialPension,
          breadwinnerAge: values.breadwinnerAge,
          goals: {
            educationTier: values.educationTier,
          },
        }
        setProfile(profile)
        setStep(1)
      } catch {
        message.warning(t('onboarding.warnRequired'))
      }
    } else if (step === 1) {
      const rawScore = Object.values(riskAnswers).reduce((a, b) => a + b, 0)
      const normalized = normalizeRiskScore(rawScore)
      useStore.getState().updateProfile({ riskToleranceScore: normalized })
      setStep(2)
    } else {
      completeOnboarding()
      navigate('/dashboard')
    }
  }

  const handleSampleData = () => {
    loadSampleData()
    navigate('/dashboard')
  }

  // Step 0: Household Profile
  const renderStep0 = () => (
    <Card title={t('onboarding.step1.title')} style={{ maxWidth: 600, margin: '0 auto' }}>
      <Form form={form} layout="vertical">
        <Form.Item label={t('onboarding.age1')} name="age1" rules={[{ required: true, message: t('onboarding.age1') }]}>
          <InputNumber min={18} max={100} style={{ width: '100%' }} placeholder={t('onboarding.age1.ph')} />
        </Form.Item>
        <Form.Item label={t('onboarding.age2')} name="age2">
          <InputNumber min={18} max={100} style={{ width: '100%' }} placeholder={t('onboarding.age2.ph')} />
        </Form.Item>
        <Form.Item label={t('onboarding.breadwinner')} name="breadwinnerAge"
          extra={t('onboarding.breadwinner.extra')}>
          <InputNumber min={18} max={100} style={{ width: '100%' }} placeholder={t('common.optional')} />
        </Form.Item>
        <Form.Item label={t('onboarding.dependents')} name="dependentCount">
          <InputNumber min={0} max={10} style={{ width: '100%' }} placeholder="0" />
        </Form.Item>
        <Form.Item label={t('onboarding.dependentAges')} name="dependentAges">
          <InputNumber min={0} max={100} style={{ width: '100%' }} placeholder={t('onboarding.dependentAges.ph')} />
        </Form.Item>
        <Form.Item label={t('onboarding.income')} name="annualIncome" rules={[{ required: true, message: t('onboarding.income') }]}>
          <InputNumber min={0} style={{ width: '100%' }} placeholder="¥" formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
        </Form.Item>
        <Form.Item label={t('onboarding.expense')} name="monthlyEssentialExpense" rules={[{ required: true, message: t('onboarding.expense') }]}
          extra={t('onboarding.expense.extra')}>
          <InputNumber min={0} style={{ width: '100%' }} placeholder="¥" />
        </Form.Item>
        <Form.Item label={t('onboarding.pension')} name="monthlySocialPension"
          extra={t('onboarding.pension.extra')}>
          <InputNumber min={0} style={{ width: '100%' }} placeholder="¥/月" />
        </Form.Item>
        <Form.Item label={t('onboarding.eduTier')} name="educationTier"
          extra={t('onboarding.eduTier.extra')}>
          <Select
            allowClear
            placeholder="无教育目标"
            options={[
              { value: 'domestic', label: t('onboarding.eduTier.domestic') },
              { value: 'overseas', label: t('onboarding.eduTier.overseas') },
            ]}
          />
        </Form.Item>
        <Form.Item label={t('onboarding.stability')} name="incomeStability">
          <Select options={[
            { value: 'stable', label: t('onboarding.stability.stable') },
            { value: 'variable', label: t('onboarding.stability.variable') },
            { value: 'self-employed-risky', label: t('onboarding.stability.risky') },
          ]} />
        </Form.Item>
      </Form>
    </Card>
  )

  // Step 1: Risk Questionnaire
  const renderStep1 = () => (
    <Card title={t('onboarding.step2.title')} style={{ maxWidth: 700, margin: '0 auto' }}>
      <Text type="secondary" style={{ marginBottom: 16, display: 'block' }}>
        {t('onboarding.step2.hint', { count: riskQuestions.length })}
      </Text>
      {riskQuestions.map((q) => (
        <Card key={q.id} size="small" style={{ marginBottom: 12 }} title={`${q.id}. ${q.question}`}>
          <Radio.Group
            onChange={(e) => setRiskAnswers({ ...riskAnswers, [q.id]: e.target.value })}
            value={riskAnswers[q.id]}
          >
            <Space direction="vertical">
              {q.options.map((opt) => (
                <Radio key={opt.label} value={opt.score}>
                  {opt.label}
                </Radio>
              ))}
            </Space>
          </Radio.Group>
        </Card>
      ))}
    </Card>
  )

  // Step 2: Completion
  const rawScore = Object.values(riskAnswers).reduce((a, b) => a + b, 0)
  const normalized = normalizeRiskScore(rawScore)
  const riskProfile = getRiskProfile(normalized)

  const renderStep2 = () => (
    <Card style={{ maxWidth: 500, margin: '0 auto', textAlign: 'center' }}>
      <Result
        icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
        title={t('onboarding.step3.title')}
        subTitle={
          <div>
            <Paragraph>{t('onboarding.step3.score', { score: normalized })}</Paragraph>
            <Paragraph strong>{locale === 'en' ? (riskProfile.level === '保守型' ? 'Conservative' : riskProfile.level === '稳健型' ? 'Moderate' : 'Aggressive') : riskProfile.level} — {riskProfile.description}</Paragraph>
            <Divider />
            <Paragraph type="secondary">
              {t('onboarding.step3.next')}
            </Paragraph>
          </div>
        }
      />
    </Card>
  )

  const stepItems = [
    { title: t('onboarding.steps.0') },
    { title: t('onboarding.steps.1') },
    { title: t('onboarding.steps.2') },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', padding: '48px 24px' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <Title level={2} style={{ color: '#1E5EFF' }}>Open-Balance</Title>
        <Text type="secondary">{t('onboarding.title')}</Text>
      </div>

      <Steps current={step} items={stepItems} style={{ maxWidth: 500, margin: '0 auto 32px' }} />

      {step === 0 && renderStep0()}
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}

      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <Space>
          {step > 0 && (
            <Button onClick={() => setStep(step - 1)}>{t('common.back')}</Button>
          )}
          <Button type="primary" onClick={handleNext}>
            {step === 2 ? t('common.start') : t('common.next')}
          </Button>
          {step === 0 && (
            <Button type="dashed" onClick={handleSampleData}>
              {t('onboarding.sample')}
            </Button>
          )}
        </Space>
      </div>
    </div>
  )
}
