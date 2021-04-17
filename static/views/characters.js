import { AbstractView, html, qs } from '../common.js'
import { characterRepository } from '../character-api.js'
import { pushRoute } from '../main.js'

const viewContent = html`
<div class="characters">
	<h1 class="characters__header">Characters</h1>
	<section class="characters__section characters__section--new">
		<button
			class="new-character__button"
			data-js="new-character-button"
			type="button"
		>
			+ New Character
		</button>
	</section>
	<section class="characters__section">
		<div
			class="characters-empty-message"
			data-js="empty-message"
		>
			Created characters will be displayed here.
		</div>
		<div
			class="characters-container"
			data-js="characters-container"
		>

		</div>
	</section>
</div>
`

const characterTemplate = html`
	<li class="characters-list__item">
		<a data-js="link" data-link>
			<div class="character-card">
				<img
					class="character-card__portrait"
					data-js="portrait"
					alt="character portrait"
					src="./static/images/portrait-placeholder.svg"
				/>
				<span class="character-card__info">
					<span class="character-card__name" data-js="name"></span>
					<span class="character-card__class" data-js="class"></span>
					<span class="character-card__origin" data-js="origin"></span>
					<span class="character-card__archetype" data-js="archetype"></span>
					<span class="character-card__level" data-js="level"></span>
				</span>
			</div>
		</a>
	</li>
`

export default class CharactersView extends AbstractView {
	async mount () {
		const content = viewContent.cloneNode(true)

		qs('new-character-button', content)
			.addEventListener('click', async () => {
				const newId = await characterRepository.create()
				pushRoute(`/character/${newId}`)
			})

		const characters = await characterRepository.listAll()
		if (characters.length === 0) {
			qs('empty-message', content).style.setProperty('display', 'inline')
		}
		else {
			const charactersContainer = qs('characters-container', content)
			const charactersList = document.createElement('ul')
			charactersList.classList.add('characters-list')

			for (const character of characters) {
				const card = characterTemplate.cloneNode(true)

				qs('link', card).href = `/character/${character.idx}`
				qs('name', card).textContent = character.info.name || 'Unnamed character'
				qs('class', card).textContent = `Class: ${character.info.charClass}`
				qs('origin', card).textContent = `Origin: ${character.info.origin}`
				qs('level', card).textContent = `Lv: ${character.info.level}`

				if (character.info.portrait !== null) {
					qs('portrait', card).href = character.info.portrait
				}

				if (character.info.archetype !== 'none') {
					qs('archetype', card).textContent = `Archetype: ${character.info.archetype}`
				}

				charactersList.appendChild(card)
			}

			charactersContainer.appendChild(charactersList)
		}

		this.rootEl.appendChild(content)
	}
}