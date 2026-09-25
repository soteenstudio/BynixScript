const { compileSource } = require('../scripts/compile.cjs')

const style = document.createElement('style')
style.textContent = 'bynix { display: none; }'
style.classList.add('bynix-style')
document.head.appendChild(style)

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('bynix').forEach(async tag => {
    const sourcePath = tag.getAttribute('src')
    try {
      if (sourcePath && !['.bs', '.bys', '.bynixscript', '.mbs'].some(extension => sourcePath.endsWith(extension))) {
        throw new Error(`Unsupported BynixScript file: ${sourcePath}`)
      }
      const source = sourcePath
        ? await fetch(sourcePath).then(response => {
          if (!response.ok) throw new Error(`Failed to fetch ${sourcePath}: ${response.status}`)
          return response.text()
        })
        : tag.textContent
      const script = document.createElement('script')
      script.textContent = compileSource(source, tag.getAttribute('allowJs') === 'true')
      document.body.appendChild(script)
      tag.remove()
    } catch (error) {
      console.error('Error executing BynixScript code:', error)
    }
  })
})
