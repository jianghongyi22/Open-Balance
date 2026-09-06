import { Alert } from 'antd'

/**
 * 常驻免责声明组件：教育演示 + 估算误差提示。
 * 用于报告/总览/情景分析等展示诊断结论的页面。
 */
export default function DisclaimerBanner({ compact = false }: { compact?: boolean }) {
  const text =
    '本工具为教育演示用途：市场参数与情景假设均为估算值，A-D 评级不构成适当性结论或投资建议。'
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
      message="教育演示 · 估算误差提示"
      description={text}
      style={{ marginBottom: 16 }}
    />
  )
}
