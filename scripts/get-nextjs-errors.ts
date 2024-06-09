import { writeFile } from 'fs/promises'
import { join } from 'path'
import { fetchGitHubAPI } from '../src/utils/fetch-github-api'
import dotenv from 'dotenv'

dotenv.config({ path: join(process.cwd(), '.env.local') })

type GitHubAPIResponse = {
  name: string
  path: string
  sha: string
  size: number
  url: string
  html_url: string
  git_url: string
  download_url: string
  type: string
  _links: {
    self: string
    git: string
    html: string
  }
}

type NextDoc = {
  path: string
  docUrl: string
  prodUrl: string
  sha: string
  size: number
  content: string
}

async function errorPathToProdURL(path: string) {
  const prodPath = path.replace('errors/', 'docs/messages/').replace('.mdx', '')
  return `https://nextjs.org/${prodPath}`
}

async function getNextJSErrors(endpoint?: string): Promise<NextDoc[]> {
  endpoint = endpoint
    ? `/repos/vercel/next.js/contents/${endpoint}`
    : '/repos/vercel/next.js/contents/errors'
  const response: GitHubAPIResponse[] = await fetchGitHubAPI({
    endpoint,
  })

  const docs: NextDoc[] = []
  const job = response.map(
    async ({ type, name, url, html_url, path, sha, size }) => {
      if (type === 'file' && name.endsWith('.mdx')) {
        const file = await fetchGitHubAPI({
          url,
        })
        const content = Buffer.from(file.content, file.encoding).toString(
          'utf-8'
        )
        const nextDoc: NextDoc = {
          path,
          docUrl: html_url,
          prodUrl: await errorPathToProdURL(path),
          sha,
          size,
          content,
        }
        docs.push(nextDoc)
      } else if (type === 'dir') {
        docs.push(...(await getNextJSErrors(path)))
      } else {
        console.log(`Skipped ${name}`)
      }
    }
  )

  await Promise.all(job)
  return docs
}

async function main() {
  console.log('Fetching Next.js error docs...')

  let docs: NextDoc[] = []
  const start = Date.now()
  try {
    docs = await getNextJSErrors()
  } finally {
    console.log(`Finished in ${Date.now() - start}ms`)
    console.log(`Fetched ${docs.length} docs`)

    await writeFile(
      join(process.cwd(), 'public', 'json', 'nextjs-errors.json'),
      JSON.stringify(docs)
    )
  }
}

main().catch(console.error)
