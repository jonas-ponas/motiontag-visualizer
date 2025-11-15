declare module '*.png' {
	const value: string
	export default value
}

declare module '*.svg' {
	const value: string
	export default value
}

type d3_Element<T extends d3.BaseType> = d3.Selection<T, unknown, HTMLElement, unknown>