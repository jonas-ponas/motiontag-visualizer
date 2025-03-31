import * as d3 from 'd3'
import { getColorForMode } from './constants'

export type Entry = {
	[key: string]: any
	total: number
	date: Date
}

export interface DailyDistanceHeatMapOptions {
	onSelect?: (entry: Entry | null) => void
}

export class DailyDistanceHeatMap {
	private static HEIGHT = 200
	private static DAYS = ['So', 'Sa', 'Fr', 'Do', 'Mi', 'Di', 'Mo']
	private static MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
	private static COLOR_RAMP = [
		'#fff5eb',
		'#EAECE0',
		'#E3E9D9',
		'#DCE6D2',
		'#D5E3CB',
		'#CFE0C4',
		'#C8DDBD',
		'#C1DAB6',
		'#BBD7AF',
		'#B4D4A8',
		'#ADD1A1',
		'#A7CE9A',
		'#A0CB93',
		'#99C88C',
		'#93C586',
		'#9CB680',
		'#A5A87B',
		'#AF9976',
		'#B88B71',
		'#C27C6C',
		'#CB6E67',
		'#D56062',
	]
	private static GRID_COLOR = '#ebedf0'
	private static WEEK_NR_COLOR = '#bdbec0'
	private static HOVER_STROKE = '#000000'
	private static SELECT_STROKE = '#000000'

	private svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, unknown>
	private svg_g: d3.Selection<SVGGElement, unknown, HTMLElement, unknown> | null = null
	private tooltip: d3.Selection<HTMLDivElement, unknown, HTMLElement, unknown>
	private select_rect: d3.Selection<SVGRectElement, unknown, HTMLElement, unknown> | null = null

	private xScale: d3.ScaleBand<string> | null = null
	private yScale: d3.ScaleBand<string> | null = null

	private selectedEntry: Entry | null = null
	private options: DailyDistanceHeatMapOptions = {}

	constructor(element: string, options?: DailyDistanceHeatMapOptions) {
		this.svg = d3.select(element).append('svg')
		this.tooltip = d3.select('#heat').append('div').attr('class', 'tooltip').text('')
		this.options = options ?? {}
	}

	public drawGrid(year: number) {
		const weeks = Array.from({ length: this.getISOWeeksInYear(year) }, (_, index) => `${index + 1}`)

		this.yScale = d3
			.scaleBand()
			.range([DailyDistanceHeatMap.HEIGHT - 16, 0])
			.domain(DailyDistanceHeatMap.DAYS)

		this.xScale = d3
			.scaleBand()
			.range([0, this.yScale.bandwidth() * weeks.length])
			.domain(weeks)

		const width = (this.xScale.bandwidth() + 1) * weeks.length - 23

		this.svg_g = this.svg
			.attr('width', Math.floor(width))
			.attr('height', DailyDistanceHeatMap.HEIGHT)
			.append('g')
			.attr('transform', 'translate(23, 16)')

		this.tooltip.style('width', `${width - 23}px`)
		this.tooltip.style('margin-left', `23px`)

		this.select_rect = this.svg_g
			.append('rect')
			.style('opacity', 0)
			.attr('width', this.xScale.bandwidth())
			.attr('height', this.yScale.bandwidth())
			.attr('stroke', DailyDistanceHeatMap.SELECT_STROKE)

		this.drawAxis()
	}

	private drawAxis() {
		if (this.yScale == null || this.xScale == null || this.svg_g == null) return

		const yAxis = this.svg_g.append('g').call(d3.axisLeft(this.yScale))
		yAxis.select('.domain').remove()
		yAxis
			.selectAll('.tick line')
			.attr('x2', this.xScale.bandwidth() * this.xScale.domain().length)
			.attr('stroke-opacity', 0.5)
			.attr('stroke-width', this.yScale.bandwidth() - 5)
			.attr('stroke', DailyDistanceHeatMap.GRID_COLOR)

		const xAxis = this.svg_g.append('g').call(
			d3.axisTop(this.xScale).tickFormat((domainValue) => {
				const weekNr = parseInt(domainValue)
				if (this.getMonthFromWeek(weekNr - 1, 2024) != this.getMonthFromWeek(weekNr, 2024)) {
					return this.getMonthFromWeek(weekNr, 2024)
				}
				return domainValue
			})
		)
		xAxis.select('.domain').remove()
		xAxis
			.selectAll('.tick line')
			.attr('y2', this.yScale.bandwidth() * this.yScale.domain().length)
			.attr('stroke-opacity', 0.5)
			.attr('stroke-width', this.xScale.bandwidth() - 5)
			.attr('stroke', DailyDistanceHeatMap.GRID_COLOR)
		xAxis
			.selectAll('.tick text')
			.filter(function () {
				return Number.isNaN(parseInt(d3.select(this).text()))
			})
			.attr('font-weight', 'bolder')

		xAxis
			.selectAll('.tick text')
			.filter(function () {
				return !Number.isNaN(parseInt(d3.select(this).text()))
			})
			.attr('fill', DailyDistanceHeatMap.WEEK_NR_COLOR)
	}

	private drawSelected() {
		if (this.select_rect == null) return

		this.select_rect.transition()
		if (this.selectedEntry == null) {
			this.select_rect.style('opacity', 0)
			this.tooltip.html('')
			return
		}

		this.select_rect
			.style('opacity', 1)
			.attr('x', (entry) => this.xScale!(`${this.getISOWeekNumber(this.selectedEntry!.date!)}`)!)
			.attr(
				'y',
				(entry) => this.yScale!(['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][this.selectedEntry!.date!.getDay()])!
			)

		this.tooltip.html(DailyDistanceHeatMap.getDescription(this.selectedEntry))
	}

	private static getDescription(entry: Entry) {
		const distance = entry.total > 5000 ? Math.round(entry.total / 100) / 10 + 'km' : entry.total + 'm'
		const date = `${entry.date.getDate()}. ${
			DailyDistanceHeatMap.MONTHS[entry.date.getMonth()]
		} ${entry.date.getFullYear()}`

		const modes = Object.keys(entry)
			.filter((key) => !(key == 'date' || key == 'total'))
			.sort((a, b) => {
				return entry[a] < entry[b] ? 1 : -1
			})
			.map((key) => {
				return `<span style="background-color: ${getColorForMode(key)}">${
					entry[key] > 5000 ? Math.round(entry[key] / 100) / 10 + 'km' : entry[key] + 'm'
				} ${key}</span>`
			})
			.join('\t')
		return `<b>${date}:</b> ${distance}, <b>Modes:</b> ${modes}`
	}

	public drawData(data: Entry[], upperBound?: number) {
		if (this.xScale == null || this.yScale == null || this.svg_g == null) return

		this.svg_g.select('g[role=data]').remove()
		const tooltip = this.tooltip
		const onSelect = this.options.onSelect

		const getSelectedDate = () => this.selectedEntry?.date || null
		const setSelectedDate = (entry: Entry | null) => {
			this.selectedEntry = entry
			this.drawSelected()
		}

		const colorRamp = d3
			.scaleQuantize()
			// @ts-expect-error
			.range(DailyDistanceHeatMap.COLOR_RAMP)
			.domain([0, upperBound ?? 300 * 1000])

		this.svg_g
			.append('g')
			.attr('role', 'data')
			.selectAll()
			.data(data)
			.join('rect')
			.attr('x', (entry) => this.xScale!(`${this.getISOWeekNumber(entry.date)}`)!)
			.attr('y', (entry) => this.yScale!(['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][entry.date.getDay()])!)
			.attr('width', () => this.xScale!.bandwidth() - 5)
			.attr('height', () => this.yScale!.bandwidth() - 5)
			.attr('transform', `translate(2.5, 2.5)`)
			// .attr('border-radius', "")
			.attr('fill', (entry) => colorRamp(entry.total))
			.on('mouseover', function (event, entry) {
				d3.select(this).attr('stroke', DailyDistanceHeatMap.HOVER_STROKE)
				if (getSelectedDate() == null) tooltip.html(DailyDistanceHeatMap.getDescription(entry))
			})
			.on('mouseleave', function (event, entry) {
				d3.select(this).attr('stroke', 'none')
				if (getSelectedDate() == null) tooltip.html('')
			})
			.on('click', (event, entry) => {
				if (getSelectedDate() != null && getSelectedDate()!.toDateString() == entry.date.toDateString()) {
					setSelectedDate(null)
					if (this.options.onSelect) this.options.onSelect(null)
					return
				}
				setSelectedDate(entry)
				if (this.options.onSelect) this.options.onSelect(entry)
			})
	}

	// -- Date functions

	private getISOWeeksInYear(year: number): number {
		const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0

		const lastDayOfYear = new Date(year, 11, 31)

		return lastDayOfYear.getDay() == 4 || (isLeapYear && lastDayOfYear.getDay() == 5) ? 53 : 52
	}

	private getISOWeekNumber(date: Date): number {
		const tempDate = new Date(date.valueOf())

		const dayNum = (date.getDay() + 6) % 7

		tempDate.setDate(tempDate.getDate() - dayNum + 3)

		const firstThursday = tempDate.valueOf()

		tempDate.setMonth(0, 1)

		if (tempDate.getDay() !== 4) {
			tempDate.setMonth(0, 1 + ((4 - tempDate.getDay() + 7) % 7))
		}

		return 1 + Math.ceil((firstThursday - tempDate.valueOf()) / 604800000)
	}

	private getMonthFromWeek(week: number, year: number) {
		let d = new Date(year, 0, 1 + (week - 1) * 7)
		d.getUTCDay() < 5
			? d.setUTCDate(d.getUTCDate() - d.getUTCDay() + 1)
			: d.setUTCDate(d.getUTCDate() + 8 - d.getUTCDay())
		return DailyDistanceHeatMap.MONTHS[d.getMonth()]
	}
}
