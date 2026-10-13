export async function extractResumePdf(file) {
  const [pdfjs, { default: workerSrc }] = await Promise.all([
    import('pdfjs-dist/legacy/build/pdf.mjs'),
    import('pdfjs-dist/legacy/build/pdf.worker.mjs?url'),
  ])
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc
  const task = pdfjs.getDocument({ data: await file.arrayBuffer(), isEvalSupported: false })
  try {
    const pdf = await task.promise
    const pages = []
    for (let index = 1; index <= pdf.numPages; index++) {
      const page = await pdf.getPage(index)
      const content = await page.getTextContent()
      pages.push(content.items.map(item => item.str || '').join(' '))
    }
    return pages.join('\n').trim().replace(/\s{3,}/g, '\n')
  } finally {
    await task.destroy()
  }
}
