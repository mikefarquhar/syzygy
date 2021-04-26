// CONSTANTS =======================================================================================
const TEMPLATE_MARKER = '{{}}'

// MODULE GLOBALS ==================================================================================
const templateCache = new WeakMap()
const rootContentCache = new WeakMap()

// METHODS =========================================================================================
// API
export function html (strings, ...values) {
	return new HTMLResult(strings, values)
}

export function render (htmlResult, container, {
	childNodePart = rootContentCache.get(container),
	markerNode = null,
} = {}) {
	let templateInfo = templateCache.get(htmlResult.strings)
	if (templateInfo === undefined) {
		templateInfo = defineTemplate(htmlResult.strings)
		templateCache.set(htmlResult.strings, templateInfo)
	}

	if (childNodePart === undefined) {
		childNodePart = new ChildNodePart(null, 0, null)
		rootContentCache.set(container, childNodePart)
	}

	if (
		childNodePart.contentInfo === null ||
		childNodePart.contentInfo.template !== templateInfo.template
	) {
		removeRenderedNodes(childNodePart)

		const [content, contentInfo] = prepareContent(templateInfo)
		childNodePart.lastNode = content.lastChild
		childNodePart.length = content.childNodes.length
		childNodePart.contentInfo = contentInfo

		container.insertBefore(content, markerNode)
	}

	updateValues(childNodePart.contentInfo.parts, htmlResult.values)
}

// Step 1: Define
function defineTemplate (htmlStrings) {
	const template = document.createElement('template')
	template.innerHTML = htmlStrings.join(TEMPLATE_MARKER)

	const partMetadata = []
	for (const [node, index] of walkNodes(template.content)) {
		switch (node.nodeType) {
			case Node.TEXT_NODE:
				defineTextNode(node, index, partMetadata)
				break
			case Node.ELEMENT_NODE:
				defineElementNode(node, index, partMetadata)
				break
			case Node.COMMENT_NODE:
				defineCommentNode(node, index, partMetadata)
				break
			default:
				throw new TypeError(`Unhandled node ${node.nodeName} (${node.nodeType}).`)
		}
	}

	return new TemplateResult(template, partMetadata)
}

function defineTextNode (node, index, partMetadata) {
	if (node.data.startsWith(TEMPLATE_MARKER)) {
		if (node.data.length > TEMPLATE_MARKER.length) {
			node.splitText(TEMPLATE_MARKER.length)
		}
		node.data = ''
		partMetadata.push(new NodePartMeta(index))
	}
	else {
		const offset = node.data.indexOf(TEMPLATE_MARKER)
		if (offset !== -1) {
			node.splitText(offset)
		}
	}
}

function defineElementNode (node, index, partMetadata) {
	for (const attrName of node.getAttributeNames()) {
		const attrValue = node.getAttribute(attrName)

		if (attrName.startsWith('on')) {
			if (attrValue === TEMPLATE_MARKER) {
				partMetadata.push(new EventPartMeta(index, attrName))
				node.removeAttribute(attrName)
			}
		}
		else if (attrValue === TEMPLATE_MARKER) {
			partMetadata.push(new AttributePartMeta(index, attrName))
			node.removeAttribute(attrName)
		}
		else {
			if (attrValue.indexOf(TEMPLATE_MARKER) !== -1) {
				const attrChunks = attrValue.split(TEMPLATE_MARKER)
				partMetadata.push(new AttributeTemplatePartMeta(index, attrName, attrChunks))
				node.removeAttribute(attrName)
			}
		}
	}
}

function defineCommentNode (node, index, partMetadata) {
	let count = 0
	let offset = -1
	while ((offset = node.data.indexOf(TEMPLATE_MARKER, offset + 1)) !== -1) {
		count++
	}

	if (count > 0) {
		partMetadata.push(new CommentPartMeta(index, count))
	}
}

// Step 2: Prepare
function prepareContent (templateResult) {
	const { template, partMetadata } = templateResult

	const content = template.content.cloneNode(true)

	const parts = []
	const nodeIter = walkNodes(content)
	let [node, nodeIndex] = nodeIter.next().value

	for (let i = 0, len = partMetadata.length; i < len; ++i) {
		const partMeta = partMetadata[i]

		while (nodeIndex < partMeta.nodeIndex) {
			[node, nodeIndex] = nodeIter.next().value
		}

		parts.push(partMeta.createPart(node))
	}

	const contentInfo = new ContentInfo(template, parts)
	return [content, contentInfo]
}

// Step 3: Update values
function updateValues (parts, values) {
	let valueIndex = 0

	for (let i = 0, len = parts.length; i < len; ++i) {
		const part = parts[i]
		part.update(values, valueIndex)
		valueIndex += part.meta.valueCount
	}
}

function removeRenderedNodes (childNodePart) {
	let node = childNodePart.lastNode
	while (childNodePart.length > 0) {
		const nextNode = node.previousSibling
		node.remove()
		node = nextNode
		childNodePart.length--
	}
}

// Utils
function * walkNodes (rootNode) {
	let nodeIndex = 0
	let node = rootNode.firstChild

	while (true) {
		yield [node, nodeIndex++]

		if (node.firstChild !== null) {
			node = node.firstChild
		}
		else {
			while (node.nextSibling === null) {
				node = node.parentNode
				if (node === rootNode) {
					return
				}
			}
			node = node.nextSibling
		}
	}
}

// TYPES ===========================================================================================
class HTMLResult {
	constructor (strings, values) {
		this.strings = strings
		this.values = values
	}
}

class TemplateResult {
	constructor (template, partMetadata) {
		this.template = template
		this.partMetadata = partMetadata
	}
}

class ContentInfo {
	constructor (template, parts) {
		this.template = template
		this.parts = parts
	}
}

// Part metadata types.
class PartMeta {
	constructor (nodeIndex, valueCount) {
		this.nodeIndex = nodeIndex
		this.valueCount = valueCount
	}

	createPart (_node) {
		throw new Error('Not implemented.')
	}
}

class EventPartMeta extends PartMeta {
	constructor (nodeIndex, attrName) {
		super(nodeIndex, 1)
		this.attrName = attrName
	}

	createPart (node) {
		return new EventPart(this, node)
	}
}

class AttributePartMeta extends PartMeta {
	constructor (nodeIndex, attrName) {
		super(nodeIndex, 1)
		this.attrName = attrName
	}

	createPart (node) {
		return new AttributePart(this, node)
	}
}

class AttributeTemplatePartMeta extends PartMeta {
	constructor (nodeIndex, attrName, attrChunks) {
		super(nodeIndex, attrChunks.length - 1)
		this.attrName = attrName
		this.attrChunks = attrChunks
	}

	createPart (node) {
		return new AttributeTemplatePart(this, node)
	}
}

class CommentPartMeta extends PartMeta {
	createPart (node) {
		return new CommentPart(this, node)
	}
}

class NodePartMeta extends PartMeta {
	constructor (nodeIndex) {
		super(nodeIndex, 1)
	}

	createPart (node) {
		return new NodePart(this, node)
	}
}

// Part types
class Part {
	constructor (meta, node) {
		this.meta = meta
		this.node = node
	}

	update (_values, _valueIndex) {
		throw new Error('Not implemented.')
	}
}

class EventPart extends Part {
	constructor (meta, node) {
		super(meta, node)
		this.currentValue = null
	}

	update (values, valueIndex) {
		const value = values[valueIndex]

		if (typeof value !== 'function') {
			throw new TypeError('Invalid type passed to event attribute. Expected function.')
		}

		if (value !== this.currentValue) {
			this.node[this.meta.attrName] = value
			this.currentValue = value
		}
	}
}

class AttributePart extends Part {
	update (values, valueIndex) {
		const value = values[valueIndex]

		switch (typeof value) {
			case 'boolean':
				this.updateBooleanValue(value)
				break
			case 'string':
				this.updateStringValue(value)
				break
			default:
				throw new TypeError('Invalid type passed to attribute. Expected string|boolean.')
		}
	}

	updateBooleanValue (value) {
		const attrName = this.meta.attrName
		const currentValue = this.node.hasAttribute(attrName)

		if (value && !currentValue) {
			this.node.setAttribute(attrName, '')
		}
		else if (!value && currentValue) {
			this.node.removeAttribute(attrName)
		}
	}

	updateStringValue (value) {
		const attrName = this.meta.attrName
		const currentValue = this.node.getAttribute(attrName)

		if (value !== currentValue) {
			this.node.setAttribute(attrName, value)
		}
	}
}

class AttributeTemplatePart extends Part {
	constructor (meta, node) {
		super(meta, node)

		this.prevValues = []
		for (let i = 0; i < meta.valueCount; ++i) {
			this.prevValues.push(null)
		}
	}

	update (values, valueIndex) {
		let hasChanged = false
		for (let i = 0; i < this.meta.valueCount; ++i) {
			if (values[valueIndex + i] !== this.prevValues[i]) {
				hasChanged = true
				break
			}
		}

		if (hasChanged) {
			let attrValue = this.meta.attrChunks[0]
			for (let i = 0; i < this.meta.valueCount; ++i) {
				const value = values[valueIndex + i]
				if (typeof value !== 'string') {
					throw new TypeError('Invalid type passed to attribute template. Expected string.')
				}

				const strPart = this.meta.attrChunks[i + 1]

				attrValue += value + strPart
			}

			this.node.setAttribute(this.meta.attrName, attrValue)
		}
	}
}

class CommentPart extends Part {
	update (_values, _valueIndex) {
		return // No need to do anything here.
	}
}

class NodePart extends Part {
	constructor (meta, node) {
		super(meta, node.parentNode)
		this.markerNode = node.nextSibling
		this.childNodeParts = [new ChildNodePart(node, 1, null)]
	}

	update (values, valueIndex) {
		const value = values[valueIndex]

		if (Array.isArray(value)) {
			this.padAndTrim(value.length)
			this.updateArray(value)
		}
		else if (value instanceof HTMLResult) {
			this.padAndTrim(1)
			this.updateTemplate(value, 0)
		}
		else if (typeof value === 'string') {
			this.padAndTrim(1)
			this.updateString(value, 0)
		}
		else if (value == null) {
			this.padAndTrim(0)
		}
		else {
			throw new Error('Invalid type passed to node. Expected string|HTMLResult|Array<string|HTMLResult>.')
		}
	}

	updateArray (valueArray) {
		for (let i = 0, len = valueArray.length; i < len; ++i) {
			const value = valueArray[i]

			if (value instanceof HTMLResult) {
				this.updateTemplate(value, i)
			}
			else if (typeof value === 'string') {
				this.updateString(value, i)
			}
			else {
				throw new TypeError('Invalue type passed to node (in array). Expected string|HTMLResult.')
			}
		}
	}

	updateTemplate (value, childPartIndex) {
		const childNodePart = this.childNodeParts[childPartIndex]
		let markerNode = this.markerNode
		if (childNodePart.contentInfo !== null && childNodePart.contentInfo.lastNode !== null) {
			markerNode = childNodePart.lastNode.nextSibling
		}
		render(value, this.node, { childNodePart, markerNode })
	}

	updateString (value, childPartIndex) {
		const rendered = this.childNodeParts[childPartIndex]

		if (rendered.lastNode === null) {
			rendered.lastNode = document.createTextNode(value)
			rendered.length = 1
			this.node.insertBefore(rendered.lastNode, this.markerNode)
		}
		else if (rendered.contentInfo !== null) {
			const nextSibling = rendered.lastNode.nextSibling
			removeRenderedNodes(rendered)
			rendered.lastNode = document.createTextNode(value)
			rendered.length = 1
			this.node.insertBefore(rendered.lastNode, nextSibling)
		}
		else if (value !== rendered.lastNode.data) {
			rendered.lastNode.data = value
		}
	}

	padAndTrim (targetRenderedLength) {
		let diff = this.childNodeParts.length - targetRenderedLength

		while (diff > 0) {
			const rendered = this.childNodeParts.pop()
			removeRenderedNodes(rendered)
			diff--
		}

		while (diff < 0) {
			this.childNodeParts.push(new ChildNodePart(null, 0, null))
			diff++
		}
	}
}

class ChildNodePart {
	constructor (lastNode, length, contentInfo) {
		this.lastNode = lastNode
		this.length = length
		this.contentInfo = contentInfo
	}
}