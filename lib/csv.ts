export const CSV_HEADERS = ['id', 'folder', 'definition', 'answer', 'extra', 'tags', 'suspended'] as const

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
  const header = CSV_HEADERS.join(',')
  const body = rows.map((row) =>
    CSV_HEADERS.map((key) => escapeCsvValue(row[key] ?? '')).join(',')
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
  const hasHeader = CSV_HEADERS.some((key) => header.includes(key))
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
      const fromHeader = index[column]
      const value = fromHeader >= 0 ? cells[fromHeader] : cells[fallbackIndex]
      return (value ?? '').trim()
    }

    rows.push({
      id: hasHeader ? get('id', 0) : (cells[0] ?? ''),
      folder: hasHeader ? get('folder', 1) : (cells[1] ?? ''),
      definition: hasHeader ? get('definition', 2) : (cells[2] ?? cells[0] ?? ''),
      answer: hasHeader ? get('answer', 3) : (cells[3] ?? cells[1] ?? ''),
      extra: hasHeader ? get('extra', 4) : (cells[4] ?? ''),
      tags: hasHeader ? get('tags', 5) : (cells[5] ?? ''),
      suspended: hasHeader ? get('suspended', 6) : (cells[6] ?? 'false'),
    })
  }

  return rows
}

export interface ParsedCard {
  definition: string
  answer: string
  tags: string[]
}

function splitLooseLine(line: string): string[] {
  if (line.includes('\t')) return line.split('\t')
  if (line.includes(';')) return line.split(';')
  return line.split(',')
}

function looksLikeHeader(cells: string[]): boolean {
  const joined = cells.join(' ').toLowerCase()
  return joined.includes('definition') || joined.includes('front') || joined.includes('answer') || joined.includes('back')
}

export function parseCardText(text: string): ParsedCard[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length === 0) return []

  const first = splitLooseLine(lines[0]).map((cell) => cell.trim())
  const startIndex = looksLikeHeader(first) ? 1 : 0
  const cards: ParsedCard[] = []

  for (let i = startIndex; i < lines.length; i++) {
    const cells = splitLooseLine(lines[i]).map((cell) => cell.trim().replace(/^["']|["']$/g, ''))
    if (cells.length < 2 || !cells[0] || !cells[1]) continue
    cards.push({
      definition: cells[0],
      answer: cells[1],
      tags: cells[2] ? cells[2].split('|').map((tag) => tag.trim()).filter(Boolean) : [],
    })
  }

  return cards
}
