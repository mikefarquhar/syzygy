import { AbstractView, qs } from '../common.js'
import { characterRepository } from '../character-api.js'
import { html, render } from '../html-templating.js'
import { pushRoute } from '../main.js'

const PORTRAIT_PLACEHOLDER = './static/images/portrait-placeholder.svg'

export default class CharactersView extends AbstractView {
	constructor (rootEl, params) {
		super(rootEl, params)
		this.loadComplete = false
		this.characters = []
		this.newCharacterHandler = this.newCharacterHandler.bind(this)
	}

	async mount () {
		this.render()
		this.characters = await characterRepository.listAll()
		this.loadComplete = true
		this.render()
	}

	async newCharacterHandler () {
		const newId = await characterRepository.create()
		pushRoute(`/character/${newId}`)
	}

	render () {
		render(this.renderViewContent(), this.rootEl)
	}

	renderViewContent () {
		return html`
			<div class="characters">
				<h1 class="characters__header">Characters</h1>
				<section class="characters__section characters__section--new">
					<button
						class="new-character__button"
						type="button"
						onClick=${this.newCharacterHandler}
					>
						+ New Character
					</button>
				</section>
				<section class="characters__section">
					${this.renderCharacterSection()}
				</section>
			</div>
		`
	}

	renderCharacterSection () {
		if (this.loadComplete === false) {
			return null
		}
		else if (this.characters.length === 0) {
			return html`
				<div class="characters-empty-message">
					Created characters will be displayed here
				</div>
			`
		}
		else {
			return html`
				<ul class="characters-list">
					${this.characters.map(character => html`
						<li class="characters-list__item">
							<a href="/character/${character.idx.toString()}" data-link>
								<div class="character-card">
									<img
										class="character-card__portrait"
										alt=""
										src=${character.info.portrait || PORTRAIT_PLACEHOLDER}
									/>
									<span class="character-card__info">
										<span class="character-card__name">
											${character.info.name || 'Unnamed Character'}
										</span>
										<span class="character-card__class">
											${character.info.charClass}
										</span>
										<span class="character-card__origin">
											${character.info.origin}
										</span>
										<span class="character-card__archetype">
											${character.info.archetype}
										</span>
										<span class="character-card__level">
											${character.info.level.toString()}
										</span>
									</span>
								</div>
							</a>
						</li>
					`)}
				</ul>
			`
		}
	}
}