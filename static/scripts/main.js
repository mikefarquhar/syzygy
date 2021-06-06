// CONFIG ==========================================================================================
const rootElement = document.querySelector('[data-js=router-root]')

const routeDefs = [
	{ path: '#/',              view: './views/characters.js' },
	{ path: '#/character/:id', view: './views/character.js' },
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
	const currentUrl = window.location.hash

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

		updateActiveLinks(currentUrl)
		await nextView.mount()
	}
}

export function pushRoute (url) {
	window.history.pushState(null, document.title, url)
	updateRouting()
}

function paramsAreEqual (currentParams, nextParams) {
	for (const key of Object.keys(currentParams)) {
		if (currentParams[key] !== nextParams[key]) {
			return false
		}
	}
	return true
}

function updateActiveLinks (url) {
	document.querySelectorAll('[data-link]').forEach(link => {
		if (link.getAttribute('href') === url) {
			link.classList.add('active')
		}
		else {
			link.classList.remove('active')
		}
	})
}

// INIT ROUTING ====================================================================================
window.addEventListener('popstate', updateRouting)

function closestAnchor (target) {
	let node = target
	while (node !== document.documentElement) {
		if (node.nodeName === 'A') {
			return node
		}
		node = node.parentElement
	}
	return null
}

document.addEventListener('click', evt => {
	const anchor = closestAnchor(evt.target)

	if (anchor && anchor.matches('[data-link]')) {
		evt.preventDefault()

		const href = anchor.getAttribute('href')
		if (window.location.hash !== href) {
			pushRoute(href)
		}
	}
})

if (window.location.hash === '') {
	window.history.replaceState(null, document.title, '#/')
}

updateRouting()

// NAVBAR ==========================================================================================
const navToggle = document.querySelector('[data-js="page-nav-toggle"]')
const navToggleLabel = document.querySelector('[data-js="page-nav-toggle-label"]')

navToggleLabel.addEventListener('keydown', (evt) => {
	if (evt.code === 'Enter' || evt.code === 'Space') {
		const checkbox = navToggle
		checkbox.checked = !checkbox.checked
	}
})

document.addEventListener('click', (evt) => {
	if (
		navToggle.checked &&
		evt.target !== navToggle &&
		evt.target !== navToggleLabel
	) {
		evt.preventDefault()
		evt.stopPropagation()
		navToggle.checked = false
	}
})