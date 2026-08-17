import { Select, Table, Typography } from 'antd'
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
  const options = headerOptions(headers)

  const columns = [
    {
      title: '资产字段',
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
      title: '映射到文件列',
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
          placeholder="— 不映射 —"
        />
      ),
    },
  ]

  const dataSource = COLUMN_FIELDS.map((f) => ({
    key: f.key,
    label: f.label,
    required: f.required,
    fieldKey: f.key,
  }))

  return (
    <div>
      <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
        请将文件中的列名映射到 Open-Balance 资产字段。系统已尝试自动匹配。
      </Text>
      <Table
        columns={columns}
        dataSource={dataSource}
        size="small"
        pagination={false}
        bordered
      />
    </div>
  )
}
