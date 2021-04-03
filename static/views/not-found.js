import { AbstractView, html } from '../common.js'

const viewContent = html`
<h1>Not Found</h1>
<h2>The page you are looking for does not exist</h2>
`

export default class CharactersView extends AbstractView {
    async mount () {
        this.rootEl.appendChild(viewContent.cloneNode(true))
    }
}