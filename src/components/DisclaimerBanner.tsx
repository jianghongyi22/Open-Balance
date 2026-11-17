import { Alert } from 'antd'
import { useI18n } from '../i18n'

/**
 * 常驻免责声明组件：教育演示 + 估算误差提示。
 * 用于报告/总览/情景分析等展示诊断结论的页面。
 */
export default function DisclaimerBanner({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n()
  const text = t('disclaimer.full')
  if (compact) {
    return (
      <Alert
        type="warning"
        showIcon
        banner
        message={text}
        style={{ marginBottom: 12 }}
      />
    )
  }
  return (
    <Alert
      type="warning"
      showIcon
      message={t('disclaimer.title')}
      description={text}
      style={{ marginBottom: 16 }}
    />
  )
}
