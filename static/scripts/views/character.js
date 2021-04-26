import { AbstractView } from '../common.js'
import { html, render } from '../html-templating.js'

const viewContent = html`
<h1>Character</h1>
`

export default class CharactersView extends AbstractView {
	async mount () {
		render(viewContent, this.rootEl)
	}
}