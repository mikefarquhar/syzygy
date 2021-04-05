import { AbstractView, html } from '../common.js'

const viewContent = html`
<h1>Characters</h1>
`

export default class CharactersView extends AbstractView {
	async mount () {
		this.rootEl.appendChild(viewContent.cloneNode(true))
	}
}