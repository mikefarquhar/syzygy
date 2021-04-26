export class AbstractView {
	constructor (rootEl, params) {
		this.rootEl = rootEl
		this.params = params
	}

	mount () {
		return Promise.reject(new Error('Not implemented'))
	}

	unmount () {}
}