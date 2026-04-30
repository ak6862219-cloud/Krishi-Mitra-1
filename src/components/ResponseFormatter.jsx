// Converts **bold** and *italic* markers into React elements
const renderInline = (text) => {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i}>{part.slice(2, -2)}</strong>
    if (part.startsWith('*') && part.endsWith('*'))
      return <em key={i}>{part.slice(1, -1)}</em>
    return part
  })
}

const ResponseFormatter = ({ content }) => {
  if (!content) return null

  // Split into lines and parse structure
  const lines = content.split('\n')
  const elements = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i].trim()

    if (!line) { i++; continue }

    // Numbered list item: "1. text" or "1) text"
    const numberedMatch = line.match(/^(\d+)[.)]\s+(.*)/)
    if (numberedMatch) {
      const items = []
      while (i < lines.length) {
        const l = lines[i].trim()
        const m = l.match(/^(\d+)[.)]\s+(.*)/)
        if (!m) break
        items.push(m[2])
        i++
      }
      elements.push(
        <ol key={`ol-${i}`} style={{ paddingLeft: '1.4em', margin: '8px 0', lineHeight: 1.7 }}>
          {items.map((item, idx) => (
            <li key={idx} style={{ marginBottom: 6, fontSize: 14, color: '#1f2937' }}>
              {renderInline(item)}
            </li>
          ))}
        </ol>
      )
      continue
    }

    // Bullet list item: "- text" or "• text" or "* text"
    const bulletMatch = line.match(/^[-•*]\s+(.*)/)
    if (bulletMatch) {
      const items = []
      while (i < lines.length) {
        const l = lines[i].trim()
        const m = l.match(/^[-•*]\s+(.*)/)
        if (!m) break
        items.push(m[1])
        i++
      }
      elements.push(
        <ul key={`ul-${i}`} style={{ paddingLeft: '1.4em', margin: '8px 0', lineHeight: 1.7 }}>
          {items.map((item, idx) => (
            <li key={idx} style={{ marginBottom: 6, fontSize: 14, color: '#1f2937' }}>
              {renderInline(item)}
            </li>
          ))}
        </ul>
      )
      continue
    }

    // Regular paragraph
    elements.push(
      <p key={`p-${i}`} style={{ margin: '6px 0', fontSize: 14, color: '#1f2937', lineHeight: 1.7 }}>
        {renderInline(line)}
      </p>
    )
    i++
  }

  return <div style={{ padding: '2px 0' }}>{elements}</div>
}

export default ResponseFormatter