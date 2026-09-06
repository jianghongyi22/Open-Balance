import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Steps, Button, Card, Form, InputNumber, Select, Radio, Space,
  Result, Typography, message, Divider,
} from 'antd'
import { LoadingOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { useStore } from '../store'
import { RISK_QUESTIONS, normalizeRiskScore, getRiskProfile } from '../data/riskQuestionnaire'
import type { HouseholdProfile } from '../types'

const { Title, Text, Paragraph } = Typography

export default function Onboarding() {
  const [step, setStep] = useState(0)
  const [form] = Form.useForm()
  const [riskAnswers, setRiskAnswers] = useState<Record<number, number>>({})
  const navigate = useNavigate()
  const { setProfile, loadSampleData, completeOnboarding } = useStore()

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
        message.warning('请完成所有必填项')
      }
    } else if (step === 1) {
      const rawScore = Object.values(riskAnswers).reduce((a, b) => a + b, 0)
      const normalized = normalizeRiskScore(rawScore)
      const profile = getRiskProfile(normalized)
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
    <Card title="第一步：家庭基本信息" style={{ maxWidth: 600, margin: '0 auto' }}>
      <Form form={form} layout="vertical">
        <Form.Item label="您的年龄" name="age1" rules={[{ required: true, message: '请输入年龄' }]}>
          <InputNumber min={18} max={100} style={{ width: '100%' }} placeholder="本人年龄" />
        </Form.Item>
        <Form.Item label="配偶/伴侣年龄（如适用）" name="age2">
          <InputNumber min={18} max={100} style={{ width: '100%' }} placeholder="如无则不填" />
        </Form.Item>
        <Form.Item label="家庭经济支柱年龄" name="breadwinnerAge"
          extra="选填。生命周期检查（110-年龄法则）使用此年龄；不填则自动取60岁以下成员最大年龄">
          <InputNumber min={18} max={100} style={{ width: '100%' }} placeholder="默认自动推算" />
        </Form.Item>
        <Form.Item label="抚养人数（未成年子女/老人）" name="dependentCount">
          <InputNumber min={0} max={10} style={{ width: '100%' }} placeholder="0" />
        </Form.Item>
        <Form.Item label="抚养对象年龄" name="dependentAges">
          <InputNumber min={0} max={100} style={{ width: '100%' }} placeholder="主要抚养对象年龄（选填）" />
        </Form.Item>
        <Form.Item label="家庭年收入（税后）" name="annualIncome" rules={[{ required: true, message: '请输入年收入' }]}>
          <InputNumber min={0} style={{ width: '100%' }} placeholder="¥" formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
        </Form.Item>
        <Form.Item label="月度刚性支出" name="monthlyEssentialExpense" rules={[{ required: true, message: '请输入月支出' }]}
          extra="房贷/房租+伙食+交通+教育+基本生活">
          <InputNumber min={0} style={{ width: '100%' }} placeholder="¥" />
        </Form.Item>
        <Form.Item label="预计退休后社保/企业年金月领额" name="monthlySocialPension"
          extra="选填。不填时按年收入的30%估算">
          <InputNumber min={0} style={{ width: '100%' }} placeholder="¥/月" />
        </Form.Item>
        <Form.Item label="子女教育目标" name="educationTier"
          extra="选填。设置后将纳入教育金检查（Q17）">
          <Select
            allowClear
            placeholder="无教育目标"
            options={[
              { value: 'domestic', label: '国内本科（约40万/4年，现价）' },
              { value: 'overseas', label: '海外本科（约160万/4年，现价）' },
            ]}
          />
        </Form.Item>
        <Form.Item label="收入稳定程度" name="incomeStability">
          <Select options={[
            { value: 'stable', label: '稳定（工资/固定收入）' },
            { value: 'variable', label: '波动（绩效/提成）' },
            { value: 'self-employed-risky', label: '自雇/创业（不确定性高）' },
          ]} />
        </Form.Item>
      </Form>
    </Card>
  )

  // Step 1: Risk Questionnaire
  const renderStep1 = () => (
    <Card title="第二步：风险承受能力测评" style={{ maxWidth: 700, margin: '0 auto' }}>
      <Text type="secondary" style={{ marginBottom: 16, display: 'block' }}>
        请根据您的实际情况选择最接近的选项，共{RISK_QUESTIONS.length}题
      </Text>
      {RISK_QUESTIONS.map((q) => (
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
        title="档案建立完成！"
        subTitle={
          <div>
            <Paragraph>风险测评得分：{normalized}/100</Paragraph>
            <Paragraph strong>{riskProfile.level} — {riskProfile.description}</Paragraph>
            <Divider />
            <Paragraph type="secondary">
              接下来将引导您录入家庭资产，或您也可以先浏览示例数据
            </Paragraph>
          </div>
        }
      />
    </Card>
  )

  const stepItems = [
    { title: '家庭信息' },
    { title: '风险测评' },
    { title: '完成' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', padding: '48px 24px' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <Title level={2} style={{ color: '#1E5EFF' }}>Open-Balance</Title>
        <Text type="secondary">家庭资产配置诊断工具 · 财务体检</Text>
      </div>

      <Steps current={step} items={stepItems} style={{ maxWidth: 500, margin: '0 auto 32px' }} />

      {step === 0 && renderStep0()}
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}

      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <Space>
          {step > 0 && (
            <Button onClick={() => setStep(step - 1)}>上一步</Button>
          )}
          <Button type="primary" onClick={handleNext}>
            {step === 2 ? '开始使用' : '下一步'}
          </Button>
          {step === 0 && (
            <Button type="dashed" onClick={handleSampleData}>
              载入示例数据体验
            </Button>
          )}
        </Space>
      </div>
    </div>
  )
}
