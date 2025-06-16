import * as d3 from 'd3'

// Ref.: https://d3-graph-gallery.com/graph/treemap_custom.html, https://billdwhite.com/wordpress/2012/12/16/d3-treemap-with-title-headers/
export interface GroupedTreeMapOptions {
    onSelect?: (entry: unknown | null) => void
}

// duplicate from DailyDistanceHeatMap
// type d3_Element<T extends d3.BaseType> = d3.Selection<T, unknown, HTMLElement, unknown>


export class GroupedTreeMap {

    private svg: d3_Element<SVGSVGElement>
	private svg_g: d3_Element<SVGGElement> | null = null

    private footer: d3_Element<HTMLDivElement>


    constructor(element: string, options?: GroupedTreeMapOptions) {
        this.svg = d3.select(element).append('svg')

        this.footer = d3.select('#heat').append('div').attr('class', 'footer')

    }

}