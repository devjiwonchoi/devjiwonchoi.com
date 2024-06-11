import { openai } from '@ai-sdk/openai'
import { embedMany } from 'ai'

function splitContentByHeadings(content: string): string[] {
  const headings = content.match(/^#+\s.+/gm)
  if (!headings) return [content]
  const contents: string[] = []
  let start = 0
  for (const heading of headings) {
    const index = content.indexOf(heading, start)
    contents.push(content.slice(start, index))
    start = index
  }
  contents.push(content.slice(start))
  // OpenAI recommends replacing newlines with spaces for best results when generating embeddings
  return contents.map((section) => section.replace(/\n/g, ' ')).filter(Boolean)
}

export type Section = {
  content: string
  embedding: number[]
}

export async function generateSections(markdown: string) {
  const sections: Section[] = []
  const contents: string[] = splitContentByHeadings(markdown)

  const { embeddings } = await embedMany({
    model: openai.embedding('text-embedding-ada-002'),
    values: contents,
  })

  for (const content of contents) {
    sections.push({
      content,
      embedding: [],
    })
  }

  embeddings.forEach((embedding, i) => {
    const section = sections[i]
    if (!section) return
    section.embedding = embedding
  })

  return sections
}
