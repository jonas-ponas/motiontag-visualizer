import * as d3 from 'd3'
import { getColorForMode } from './constants'

export type Entry = {
	// biome-ignore lint/suspicious/noExplicitAny:
	[key: string]: any
	total: number
	date: Date
}

export interface DailyDistanceHeatMapOptions {
	onSelect?: (entry: Entry | null) => void
}

// Ref.: https://d3-graph-gallery.com/heatmap, https://www.react-graph-gallery.com/heatmap
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

	private svg: d3_Element<SVGSVGElement>
	private svg_g: d3_Element<SVGGElement> | null = null
	private footer: d3_Element<HTMLDivElement>
	private tooltip: d3_Element<HTMLDivElement>
	private prevYear: d3_Element<HTMLAnchorElement>
	private currYear: d3_Element<HTMLSpanElement>
	private nextYear: d3_Element<HTMLAnchorElement>
	private selectRect: d3_Element<SVGRectElement> | null = null

	private xScale: d3.ScaleBand<string> | null = null
	private yScale: d3.ScaleBand<string> | null = null

	private selectedEntry: Entry | null = null
	private options: DailyDistanceHeatMapOptions = {}

	private yearlyData: { [key: number]: Entry[] } = {}
	private selectedYear: number | undefined;

	constructor(element: string, options?: DailyDistanceHeatMapOptions) {
		this.svg = d3.select(element).append('svg')

		this.footer = d3.select(element).append('div').attr('class', 'footer')

		this.tooltip = this.footer.append('div').attr('class', 'tooltip').text('')

		const yearSelect = this.footer.append('div').attr('class', 'select');

		this.prevYear = yearSelect.append('a').text('< Previous').attr('href', 'javascript:void(0)').attr('class', "disabled")
		this.currYear = yearSelect.append('span').text("").attr('class', 'current');
		this.nextYear = yearSelect.append('a').text('Next >').attr('href', 'javascript:void(0)').attr('class', "disabled")

		this.options = options ?? {}
	}

	private drawGrid() {
		if (this.svg_g != null)
			this.svg_g.remove()

		const weeks = Array.from({ length: 52 }, (_, index) => `${index + 1}`)

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

		this.footer.style('width', `${width - 23}px`)

		this.selectRect = this.svg_g
			.append('rect')
			.style('opacity', 0)
			.attr('width', this.xScale.bandwidth())
			.attr('height', this.yScale.bandwidth())
			.attr('stroke', DailyDistanceHeatMap.SELECT_STROKE)


		this.registerYearSelector(this.nextYear, +1)
		this.registerYearSelector(this.prevYear, -1)
	}

	private drawAxis() {
		if (this.yScale == null || this.xScale == null || this.svg_g == null) return

		this.footer.style('visibility', 'visible')
		this.svg_g.select('g[role=Xaxis]').remove()
		this.svg_g.select('g[role=Yaxis]').remove()

		const year = this.selectedYear ?? (new Date()).getFullYear();

		const yAxis = this.svg_g.append('g')
			.attr('role', 'Yaxis')
			.call(d3.axisLeft(this.yScale))

		yAxis
			.selectAll('.tick line')
			.attr('x2', this.xScale.bandwidth() * this.xScale.domain().length)
			.attr('stroke-opacity', 0.5)
			.attr('stroke-width', this.yScale.bandwidth() - 5)
			.attr('stroke', DailyDistanceHeatMap.GRID_COLOR)

		const xAxis = this.svg_g.append('g').call(
			d3.axisTop(this.xScale).tickFormat((domainValue) => {
				const weekNr = Number.parseInt(domainValue)
				if (this.getMonthFromWeek(weekNr - 1, year) !== this.getMonthFromWeek(weekNr, year)) {
					return this.getMonthFromWeek(weekNr, year)
				}
				return domainValue
			}),
		).attr('role', 'Xaxis')

		xAxis
			.selectAll('.tick line')
			.attr('y2', this.yScale.bandwidth() * this.yScale.domain().length)
			.attr('stroke-opacity', 0.5)
			.attr('stroke-width', this.xScale.bandwidth() - 5)
			.attr('stroke', DailyDistanceHeatMap.GRID_COLOR)
		xAxis
			.selectAll('.tick text')
			.filter(function () {
				return Number.isNaN(Number.parseInt(d3.select(this).text()))
			})
			.attr('font-weight', 'bolder')

		xAxis
			.selectAll('.tick text')
			.filter(function () {
				return !Number.isNaN(Number.parseInt(d3.select(this).text()))
			})
			.attr('fill', DailyDistanceHeatMap.WEEK_NR_COLOR)
	}

	private drawSelected() {
		if (this.selectRect == null) return

		this.selectRect.transition()
		if (this.selectedEntry == null) {
			this.selectRect.style('opacity', 0)
			this.tooltip.html('')
			return
		}

		this.selectRect
			.style('opacity', 1)
			.attr('x', (entry) => this.xScale!(`${this.getISOWeekNumber(this.selectedEntry!.date!)}`)!)
			.attr(
				'y',
				(entry) => this.yScale!(this.getWorkDay(this.selectedEntry!.date))!,
			)

		this.tooltip.html(DailyDistanceHeatMap.getDescription(this.selectedEntry))
	}

	private static getDescription(entry: Entry) {
		const distance = entry.total > 5000 ? `${Math.round(entry.total / 100) / 10}km` : `${entry.total}m`
		const date = `${entry.date.getDate()}. ${DailyDistanceHeatMap.MONTHS[entry.date.getMonth()]
			} ${entry.date.getFullYear()}`

		const modes = Object.keys(entry)
			.filter((key) => !(key === 'date' || key === 'total'))
			.sort((a, b) => {
				return entry[a] < entry[b] ? 1 : -1
			})
			.map((key) => {
				return `<span style="background-color: ${getColorForMode(key)}">${entry[key] > 5000 ? `${Math.round(entry[key] / 100) / 10}km` : `${entry[key]}m`
					} ${key}</span>`
			})
			.join('\t')
		return `<b>${date}:</b> ${distance}, <b>Modes:</b> ${modes}`
	}

	private drawData() {
		if (this.xScale == null || this.yScale == null || this.svg_g == null || !this.selectedYear) return

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
			.domain([0, 300 * 1000])

		this.svg_g
			.append('g')
			.attr('role', 'data')
			.selectAll()
			.data(this.yearlyData[this.selectedYear])
			.join('rect')
			.attr('x', (entry) => this.xScale!(`${this.getISOWeekNumber(entry.date)}`)!)
			.attr('y', (entry) => this.yScale!(this.getWorkDay(entry.date))!)
			.attr('width', () => this.xScale!.bandwidth() - 5)
			.attr('height', () => this.yScale!.bandwidth() - 5)
			.attr('transform', 'translate(2.5, 2.5)')
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
				if (getSelectedDate() != null && getSelectedDate()!.toDateString() === entry.date.toDateString()) {
					setSelectedDate(null)
					if (onSelect) onSelect(null)
					return
				}
				setSelectedDate(entry)
				if (onSelect) onSelect(entry)
			})
	}

	public setData(data: Entry[]) {
		for (const entry of data) {
			const year = entry.date.getFullYear()
			const month = entry.date.getMonth();
			const weekNr = this.getISOWeekNumber(entry.date)

			let isoWeekNrYear = year;

			if (month === 0 && weekNr >= 50)
				isoWeekNrYear = year - 1

			if (month === 11 && weekNr === 1)
				isoWeekNrYear = year + 1

			if (!(isoWeekNrYear in this.yearlyData))
				this.yearlyData[isoWeekNrYear] = [];

			this.yearlyData[isoWeekNrYear].push(entry);
		}

		this.selectedYear = Number.parseInt(Object.keys(this.yearlyData)[0]);
		this.redrawYear();
	}

	public redrawYear() {
		if (!this.selectedYear)
			return;

		this.currYear.html(this.selectedYear.toString())

		this.drawAxis()
		this.drawData()

		this.selectedEntry = null
		this.drawSelected();

		if (String(this.selectedYear - 1) in this.yearlyData) {
			this.prevYear.attr('class', '')
		} else {
			this.prevYear.attr('class', 'disabled')
		}

		if (String(this.selectedYear + 1) in this.yearlyData) {
			this.nextYear.attr('class', '')
		} else {
			this.nextYear.attr('class', 'disabled')
		}
	}

	public drawInitial() {
		this.drawGrid()
		this.drawAxis()
	}

	private registerYearSelector(element: d3.Selection<HTMLAnchorElement, unknown, HTMLElement, unknown>, step: number) {
		element.on('click', () => {
			if (!this.selectedYear) return;

			this.selectedYear = this.selectedYear + step;
			this.redrawYear();
		})
	}

	private getWorkDay(date: Date) {
		return ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"][date.getDay()]
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
		const d = new Date(year, 0, 1 + (week - 1) * 7)
		d.getUTCDay() < 5
			? d.setUTCDate(d.getUTCDate() - d.getUTCDay() + 1)
			: d.setUTCDate(d.getUTCDate() + 8 - d.getUTCDay())
		return DailyDistanceHeatMap.MONTHS[d.getMonth()]
	}
}
