import { Control, DomUtil, Map } from 'leaflet'
import { setData } from '..'
import FileUp from '../img/file-up.svg'

export class VisualizeControl extends Control {
	private csvInputElement: HTMLInputElement = document.createElement('input')

	constructor(options: {}) {
		super(options)

		this.csvInputElement.type = 'file'
		this.csvInputElement.accept = 'text/csv'
	}

	override onAdd(map: Map): HTMLElement {
		const vizControlDiv = DomUtil.create('div')
		vizControlDiv.classList.add('leaflet-bar')

		const loadCsvAnchor = DomUtil.create('a')
		loadCsvAnchor.classList.add('leaflet-control-load-csv')
		loadCsvAnchor.setAttribute('draggable', 'false')

		this.stopMousePropagation(loadCsvAnchor)

		const loadCsvIcon = DomUtil.create('img')
		loadCsvIcon.setAttribute('src', FileUp)

		loadCsvAnchor.appendChild(loadCsvIcon)
		vizControlDiv.appendChild(loadCsvAnchor)

		loadCsvAnchor.addEventListener('click', (event) => {
			this.loadCsvFile(event)
		})

		return vizControlDiv
	}

	private async loadCsvFile(event: MouseEvent) {
		this.csvInputElement.click()

		await new Promise<void>((resolve, reject) => this.csvInputElement.addEventListener('change', () => resolve()))
		const file = this.csvInputElement.files ? this.csvInputElement.files[0] : null

		if (file) {
			var reader = new FileReader()
			reader.readAsText(file, 'UTF-8')

			await new Promise<void>((resolve, reject) => {
				reader.onload = () => resolve()
				reader.onerror = (event) => reject((event.currentTarget as FileReader).error)
			});
			setData(reader.result as string)
		}
		event.stopPropagation()
	}

	private stopMousePropagation(element: HTMLElement) {
		element.addEventListener('dblclick', (event) => event.stopPropagation())
		element.addEventListener('drag', (event) => event.stopPropagation())
		element.addEventListener('dragstart', (event) => event.stopPropagation())
		element.addEventListener('dragleave', (event) => event.stopPropagation())
		element.addEventListener('dragenter', (event) => event.stopPropagation())
		element.addEventListener('mousemove', (event) => event.stopPropagation())
	}
}
