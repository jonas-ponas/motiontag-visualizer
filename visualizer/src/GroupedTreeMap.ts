import * as d3 from 'd3'
import { getColorForMode, getGroupForMode } from './constants'
import type { Movement } from './parser/motionTagDataParser'

export interface GroupedTreeMapOptions {
	onSelect?: (entry: unknown | null) => void
}

export type GroupedTreeMapMode = 'byTimeSpent' | 'byDistance'

export type GroupedTreemapDataPoint = {
	name: string
	totalDistance: number
	totalTime: number
	children: GroupedTreemapDataPoint[]
}

// Ref.: https://d3-graph-gallery.com/graph/treemap_custom.html, https://billdwhite.com/wordpress/2012/12/16/d3-treemap-with-title-headers/
export class GroupedTreeMap {
	private static HEIGHT = 200
	private static TREEMAP_PADDING = 1
	private static STROKE_COLOR = '#000000'
	private static STROKE_WIDTH = 2
	private static SVG_PADDING = 8

	private svg: d3_Element<SVGSVGElement>
	private svg_g: d3_Element<SVGGElement> | null = null

	private footer: d3_Element<HTMLDivElement>
	private tooltip: d3_Element<HTMLDivElement>
	private byDistanceAnchor: d3_Element<HTMLAnchorElement>
	private byTimeAnchor: d3_Element<HTMLAnchorElement>
	private selectRect: d3_Element<SVGRectElement> | null = null

	private selectedEntry: GroupedTreemapDataPoint | null = null
	private showGroupedView = true

	private groupedData: GroupedTreemapDataPoint = {
		name: 'Movements',
		totalDistance: 0,
		totalTime: 0,
		children: [],
	}

	private mode: GroupedTreeMapMode = 'byDistance'
	private width = 200

	constructor(selector: string /*, options?: GroupedTreeMapOptions */) {
		const resizeFn = () => {
			this.width = (d3.select(selector).node() as Element).getBoundingClientRect().width
		}
		window.addEventListener('resize', resizeFn)
		resizeFn()

		this.svg = d3.select(selector).append('svg')
		this.svg.attr('width', this.width).attr('height', GroupedTreeMap.HEIGHT)

		this.footer = d3.select(selector).append('div').attr('class', 'footer')
		this.tooltip = this.footer.append('div').attr('class', 'tooltip').text('')

		const modeSelect = this.footer.append('div').attr('class', 'select')
		modeSelect.append('span').text('Sort by: ')

		this.byDistanceAnchor = modeSelect.append('a').text('Distance').attr('href', 'javascript:void(0)').attr('class', 'disabled')

		this.byTimeAnchor = modeSelect.append('a').text('Time').attr('href', 'javascript:void(0)').attr('class', 'disabled')

		this.byDistanceAnchor.on('click', this.toggleMode('byDistance'))
		this.byTimeAnchor.on('click', this.toggleMode('byTimeSpent'))
	}

	private drawGrid() {
		if (this.svg_g != null) this.svg_g.remove()

		this.svg_g = this.svg
			.attr('width', this.width)
			.attr('height', GroupedTreeMap.HEIGHT)
			.append('g')
			.attr('width', this.width - GroupedTreeMap.SVG_PADDING * 2)
			.attr('height', GroupedTreeMap.HEIGHT - GroupedTreeMap.SVG_PADDING * 2)
			.attr('transform', `translate(${GroupedTreeMap.SVG_PADDING}, ${GroupedTreeMap.SVG_PADDING})`)
			.on('click', () => {
				this.showGroupedView = !this.showGroupedView
				if (this.selectedEntry != null) {
					this.setSelected(this.selectedEntry, this.showGroupedView)
				}
			})

		this.selectRect = this.svg_g
			.append('rect')
			.style('opacity', 1)
			.attr('fill', 'none')
			.attr('width', this.width)
			.attr('height', GroupedTreeMap.HEIGHT)
			.attr('stroke', GroupedTreeMap.STROKE_COLOR)
			.attr('stroke-width', GroupedTreeMap.STROKE_WIDTH)
	}

	private drawData() {
		if (this.svg_g == null) return

		this.svg_g.select('g[role=data]').remove()

		if (this.mode === 'byDistance') {
			this.byDistanceAnchor.attr('class', 'disabled')
			this.byTimeAnchor.attr('class', '')
		} else {
			this.byTimeAnchor.attr('class', 'disabled')
			this.byDistanceAnchor.attr('class', '')
		}

		this.tooltip.html(GroupedTreeMap.getDescription(this.groupedData))

		const root = d3.hierarchy(this.groupedData).sum((d) => (this.mode === 'byDistance' ? d.totalDistance : d.totalTime))

		d3
			.treemap<GroupedTreemapDataPoint>()
			.size([(this.width - 16) * this.findWidthFactor(root), (GroupedTreeMap.HEIGHT - 16) * 2])
			.padding(GroupedTreeMap.TREEMAP_PADDING)
			.tile(d3.treemapSliceDice)(root)

		this.svg_g
			.append('g')
			.attr('role', 'data')
			.selectAll('rect')
			.data(root.leaves())
			.enter()
			.append('rect')
			// @ts-expect-error
			.attr('x', (d) => d.x0)
			// @ts-expect-error
			.attr('y', (d) => d.y0)
			// @ts-expect-error
			.attr('width', (d) => d.x1 - d.x0)
			// @ts-expect-error
			.attr('height', (d) => d.y1 - d.y0)
			.style('fill', (d) => getColorForMode(d.data.name))
			.attr('data-group', (d) => getGroupForMode(d.data.name))
			.attr('data-mode', (d) => d.data.name)
			.on('mouseover', (_, entry) => {
				this.setSelected(entry.data, this.showGroupedView)
			})
			.on('mouseleave', () => {
				this.setSelected(null)
			})
	}

	private findWidthFactor<T>(root: d3.HierarchyNode<T>): number {
		let factor = 0.9
		let actualWidth = 0

		while (actualWidth <= this.width) {
			actualWidth = 0
			factor += 0.1

			d3
				.treemap<T>()
				.size([(this.width - GroupedTreeMap.SVG_PADDING * 2) * factor, (GroupedTreeMap.HEIGHT - GroupedTreeMap.SVG_PADDING * 2) * 2])
				.padding(GroupedTreeMap.TREEMAP_PADDING)
				.tile(d3.treemapSliceDice)(root)

			for (const leave of root.leaves()) {
				// @ts-expect-error
				if (leave.x1 && actualWidth <= leave.x1)
					// @ts-expect-error
					actualWidth = leave.x1
			}
		}

		return factor
	}

	public setData(data: Movement[]) {
		this.groupedData.children = []

		for (const movement of data) {
			const spentTimeInMinutes = Math.floor((movement.finished_at.getTime() - movement.started_at.getTime()) / 1000 / 60)

			this.groupedData.totalTime += spentTimeInMinutes
			this.groupedData.totalDistance += movement.length

			const groupName = getGroupForMode(movement.mode).toString()

			let group: GroupedTreemapDataPoint
			if (!this.groupedData.children.some((v) => v.name === groupName)) {
				group = {
					name: groupName,
					totalDistance: 0,
					totalTime: 0,
					children: [],
				}
				this.groupedData.children.push(group)
			} else {
				group = this.groupedData.children.find((v) => v.name === groupName)!
			}

			if (groupName === 'Other') continue

			group.totalTime += spentTimeInMinutes
			group.totalDistance += movement.length

			let mode: GroupedTreemapDataPoint
			if (!group.children.some((v) => v.name === movement.mode)) {
				mode = {
					name: movement.mode,
					totalDistance: 0,
					totalTime: 0,
					children: [],
				}
				group.children.push(mode)
			} else {
				mode = group.children.find((v) => v.name === movement.mode)!
			}

			mode.totalTime += spentTimeInMinutes
			mode.totalDistance += movement.length
		}

		this.drawGrid()
		this.drawData()
	}

	private toggleMode(mode: 'byDistance' | 'byTimeSpent') {
		return () => {
			console.log('Toggling mode to ', mode)
			this.mode = mode
			this.byDistanceAnchor.attr('class', mode === 'byDistance' ? 'disabled' : '')
			this.byTimeAnchor.attr('class', mode === 'byTimeSpent' ? 'disabled' : '')
			this.drawData()
		}
	}

	private setSelected(data: GroupedTreemapDataPoint | null, selectGroup = false) {
		if (this.svg_g == null) return

		if (data == null) {
			this.selectedEntry = null
			this.drawSelected()
			return
		}

		const newSelectedParent = this.svg_g.select("g[role='data']").select(`rect[data-mode='${data.name}']`).attr('data-group')

		if (!selectGroup) {
			this.selectedEntry = data
			this.drawSelected()
			return
		}

		const groupEntry = this.groupedData.children.filter((entry) => entry.name === newSelectedParent)[0]

		this.selectedEntry = groupEntry
		this.drawSelected()
	}

	private drawSelected() {
		if (this.svg_g == null || this.selectRect == null) return

		if (this.selectedEntry == null) {
			this.selectRect.style('opacity', 0)
			this.tooltip.html('')
			return
		}

		const selectedEntry = this.selectedEntry
		const drawGroup = this.selectedEntry.children.length > 0

		let x: number, y: number, height: number, width: number
		if (!drawGroup) {
			const mode = this.svg_g.select(`rect[data-mode='${selectedEntry.name}']`)
			x = Number.parseFloat(mode.attr('x'))
			y = Number.parseFloat(mode.attr('y'))
			height = Number.parseFloat(mode.attr('height'))
			width = Number.parseFloat(mode.attr('width'))

			this.tooltip.html(GroupedTreeMap.getDescription(selectedEntry))
		} else {
			console.log('Selected:', selectedEntry.name)
			const nodes: Element[] = this.svg_g.selectAll(`g[role=data] > rect[data-group='${selectedEntry.name}']`).nodes() as Element[]

			console.log('Nodes', nodes.length)

			height =
				nodes.reduce((sum, node) => sum + Number.parseFloat(node.getAttribute('height')!), 0) +
				(nodes.length - 1) * GroupedTreeMap.TREEMAP_PADDING

			width = Number.parseFloat(nodes[0].getAttribute('width')!)
			x = Number.parseFloat(nodes[0].getAttribute('x')!)
			y = Number.parseFloat(nodes[0].getAttribute('y')!)

			this.tooltip.html(GroupedTreeMap.getDescription(selectedEntry))
		}

		this.selectRect
			.style('opacity', 1)
			.attr('x', x - 1)
			.attr('y', y - 1)
			.attr('width', width + 2)
			.attr('height', height + 2)
	}

	private static getDescription(entry: GroupedTreemapDataPoint) {
		return `<span style="background-color: ${getColorForMode(entry.name)}">
    ${entry.name}</span>: ${Math.round(entry.totalDistance / 1000)}km / ${GroupedTreeMap.verbalizeMinutes(entry.totalTime)}`
	}

	public static verbalizeMinutes(minutes: number) {
		const HOUR = 60
		const DAY = 60 * 24
		if (minutes > HOUR && minutes < DAY) {
			return `${Math.floor(minutes / HOUR)}h ${minutes % 60}m`
		} else if (minutes > DAY) {
			const days = Math.floor(minutes / DAY)
			const hours = Math.floor((minutes - days * DAY) / HOUR)

			return `${days}T ${hours}h ${minutes % HOUR}m`
		}
		return `${minutes}m`
	}
}
