export const CSV_HEADERS = ['id', 'folder', 'definition', 'answer', 'extra', 'tags', 'suspended'] as const
export const USER_CSV_HEADERS = ['definition', 'answer', 'extra', 'tags'] as const

export interface CsvRow {
  id: string
  folder: string
  definition: string
  answer: string
  extra: string
  tags: string
  suspended: string
}

export function emptyCsvRow(folder = ''): CsvRow {
  return {
    id: '',
    folder,
    definition: '',
    answer: '',
    extra: '',
    tags: '',
    suspended: 'false',
  }
}

export function escapeCsvValue(value: string): string {
  const text = value ?? ''
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

export function serializeCsv(rows: CsvRow[]): string {
  const header = USER_CSV_HEADERS.join(',')
  const body = rows.map((row) =>
    USER_CSV_HEADERS.map((key) => escapeCsvValue(row[key] ?? '')).join(',')
  )
  return [header, ...body].join('\n')
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"'
          i += 1
        } else {
          inQuotes = false
        }
      } else {
        current += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      cells.push(current)
      current = ''
    } else {
      current += char
    }
  }
  cells.push(current)
  return cells
}

export function parseEditorCsv(text: string): CsvRow[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop()
  if (lines.length === 0) return []

  const header = parseCsvLine(lines[0]).map((cell) => cell.trim().toLowerCase())
  const knownHeaders = ['id', 'folder', 'definition', 'front', 'answer', 'back', 'extra', 'tags', 'suspended']
  const hasHeader = header.some((cell) => knownHeaders.includes(cell))
  const start = hasHeader ? 1 : 0
  const index = {
    id: header.indexOf('id'),
    folder: header.indexOf('folder'),
    definition: Math.max(header.indexOf('definition'), header.indexOf('front')),
    answer: Math.max(header.indexOf('answer'), header.indexOf('back')),
    extra: header.indexOf('extra'),
    tags: header.indexOf('tags'),
    suspended: header.indexOf('suspended'),
  }

  const rows: CsvRow[] = []
  for (let i = start; i < lines.length; i++) {
    if (!lines[i].trim()) continue
    const cells = parseCsvLine(lines[i])
    const get = (column: keyof typeof index, fallbackIndex: number) => {
      if (hasHeader) {
        const fromHeader = index[column]
        if (fromHeader < 0) return ''
        return (cells[fromHeader] ?? '').trim()
      }
      return (cells[fallbackIndex] ?? '').trim()
    }

    rows.push({
      id: hasHeader ? get('id', 0) : '',
      folder: hasHeader ? get('folder', -1) : '',
      definition: hasHeader ? get('definition', 0) : (cells[0] ?? '').trim(),
      answer: hasHeader ? get('answer', 1) : (cells[1] ?? '').trim(),
      extra: hasHeader ? get('extra', 2) : (cells[2] ?? '').trim(),
      tags: hasHeader ? get('tags', 3) : (cells[3] ?? '').trim(),
      suspended: hasHeader ? get('suspended', -1) || 'false' : 'false',
    })
  }

  return rows
}

export interface ParsedCard {
  definition: string
  answer: string
  extra: string
  tags: string[]
}

export function parseCardText(text: string): ParsedCard[] {
  return parseEditorCsv(text)
    .filter((row) => row.definition && row.answer)
    .map((row) => ({
      definition: row.definition,
      answer: row.answer,
      extra: row.extra,
      tags: parseTagList(row.tags),
    }))
}

function parseTagList(value: string): string[] {
  return [...new Set(value.split(/[,;|]/).map((tag) => tag.trim()).filter(Boolean))]
}
