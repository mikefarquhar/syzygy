export class AbstractView {
    constructor (rootEl, params) {
        this.rootEl = rootEl
        this.params = params
    }

    mount () {
        return Promise.reject(new Error('Not implemented'))
    }

    unmount () {
        this.rootEl.innerHTML = ''
    }
}

export function html (htmlStr) {
    const template = document.createElement('template')
    template.innerHTML = htmlStr
    return template.content
}