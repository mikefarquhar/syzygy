// CONFIG ==========================================================================================
const rootElement = document.querySelector('[data-js=router-root]')

const routeDefs = [
    { path: '/',              view: './views/characters.js' },
    { path: '/character/:id', view: './views/character.js' },
]

const fallbackView = './views/not-found.js'

// ROUTER ==========================================================================================
const routes = routeDefs.map(({ path, view }) => {
	const matchStr = path
			.replace(/\//g, '\\/')
			.replace(/:\w+/g, '(.+)')

	const matchExp = new RegExp(`^${matchStr}$`)

	const paramKeys = path.match(matchExp)
			.slice(1)
			.map(key => key.slice(1))

	return { path, view, matchExp, paramKeys }
})

const fallbackRoute = {
	path: null,
	view: fallbackView,
	matchExp: null,
	paramKeys: []
}

let activeRoute = null
let activeParams = []
let activeView = { unmount () {} }

export async function updateRouting () {
    const currentUrl = getCurrentUrl()

    let nextRoute = fallbackRoute
    let match = []

    for (const potentialRoute of routes) {
        const potentialMatch = currentUrl.match(potentialRoute.matchExp)

        if (potentialMatch) {
            nextRoute = potentialRoute
            match = potentialMatch.slice(1)
            break
        }
    }

    const nextParams = {}
    for (let i = 0; i < match.length; ++i) {
        const key = nextRoute.paramKeys[i]
        const value = match[i]
        nextParams[key] = value
    }

    if (activeRoute !== nextRoute || !paramsAreEqual(activeParams, nextParams)) {
        const { default: View } = await import(nextRoute.view)
        const nextView = new View(rootElement, nextParams)

        activeView.unmount()

        activeRoute = nextRoute
        activeParams = nextParams
        activeView = nextView

        await nextView.mount()
    }
}

export function pushRoute (url) {
    window.history.pushState(null, document.title, `#${url}`)
    updateRouting()
}

function getCurrentUrl() {
    return window.location.hash.slice(1) || '/'
}

function paramsAreEqual (currentParams, nextParams) {
    for (const key of Object.keys(currentParams)) {
        if (currentParams[key] !== nextParams[key]) {
            return false
        }
    }
    return true
}

// INIT ============================================================================================
window.addEventListener('popstate', updateRouting)

document.addEventListener('click', evt => {
	if (evt.target.matches('[data-link]')) {
			evt.preventDefault()

			const href = evt.target.getAttribute('href')
			if (getCurrentUrl() !== href) {
					pushRoute(href)
			}
	}
})

if (window.location.hash === '') {
	window.history.replaceState(null, document.title, '#/')
}

updateRouting()