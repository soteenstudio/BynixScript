const { compileSource } = require('bynix-native')

document.addEventListener('DOMContentLoaded', () => {
  for (const tag of document.querySelectorAll('bynix')) {
    const src = tag.getAttribute('src')
    if (src) {
      fetch(src)
        .then(response => {
          if (!response.ok) throw new Error(`Unable to fetch ${src}: ${response.status}`)
          return response.text()
        })
        .then(source => execute(tag, source))
        .catch(error => console.error(error))
    } else {
      execute(tag, tag.textContent)
    }
  }
})

function execute(tag, source) {
  try {
    ;(0, eval)(compileSource(source))
    tag.remove()
  } catch (error) {
    console.error(error)
  }
}
