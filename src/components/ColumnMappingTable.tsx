import { Select, Table, Typography } from 'antd'
import { useI18n } from '../i18n'
import type { ColumnMap } from '../importer/types'
import { COLUMN_FIELDS, headerOptions } from '../importer/column-mapper'

const { Text } = Typography

interface ColumnMappingTableProps {
  headers: string[]
  columnMap: ColumnMap
  onChange: (map: ColumnMap) => void
}

/**
 * An editable table that lets users map CSV columns to Asset fields.
 */
export default function ColumnMappingTable({
  headers,
  columnMap,
  onChange,
}: ColumnMappingTableProps) {
  const { t } = useI18n()
  const options = headerOptions(headers)

  const columns = [
    {
      title: t('colmap.field'),
      dataIndex: 'label',
      key: 'label',
      width: 140,
      render: (label: string, record: any) => (
        <span>
          {record.required && <Text type="danger">* </Text>}
          {label}
        </span>
      ),
    },
    {
      title: t('colmap.column'),
      dataIndex: 'key',
      key: 'mapping',
      render: (fieldKey: keyof ColumnMap) => (
        <Select
          style={{ width: '100%' }}
          value={columnMap[fieldKey] || ''}
          options={options}
          onChange={(val) => {
            onChange({ ...columnMap, [fieldKey]: val || null })
          }}
          placeholder={t('colmap.none')}
        />
      ),
    },
  ]

  const dataSource = COLUMN_FIELDS.map((f) => ({
    key: f.key,
    label: t(`colmap.${f.key.replace('Col', '')}`),
    required: f.required,
    fieldKey: f.key,
  }))

  return (
    <div>
      <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
        {t('colmap.hint')}
      </Text>
      <Table
        columns={columns}
        dataSource={dataSource}
        size="small"
        pagination={false}
        bordered
        scroll={{ x: 400 }}
      />
    </div>
  )
}
