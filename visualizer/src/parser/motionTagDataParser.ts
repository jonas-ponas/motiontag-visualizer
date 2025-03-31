import { LineString, MultiLineString, Point } from 'geojson'
import { LatLng } from 'leaflet'
import { WkbGeometryReader } from './wkbGeometryParser'

export class MotionTagDataParser {
	private static STAY_HEAT_INTENSITY = 1
	private static MOVE_HEAT_INTENSITY = 0.1

	private stays: Stay[] = []
	private movements: Movement[] = []
	private positionHeatMap: [number, number, number][] = []
	private distanceHeatMapByDay: { [key: string]: { [key: string]: any; total: number; date: Date } } = {}

	public async parse(data: string): Promise<void> {
		for (let line of data.split('\n').slice(1)) {
			let values = line.split(';')
			if (values.length != 24) {
				console.warn('Unexpected CSV line:', line)
				continue
			}

			if (values[15] === 't') continue // Skip "merged" entry

			let entry: Entry = {
				id: values[0],
				started_at: new Date(values[3]),
				finished_at: new Date(values[5]),
			}

			if (values[2] == 'Stay') {
				const reader = WkbGeometryReader.fromHexString(values[11])
				const geometry = reader.readAll()

				if (geometry.type != 'Point') {
					console.warn('Unexpected CSV line:', line)
					continue
				}
				const point = geometry as Point

				this.stays.push({
					...entry,
					purpose: values[10],
					position: new LatLng(point.coordinates[1], point.coordinates[0]),
				})
				this.positionHeatMap.push([point.coordinates[1], point.coordinates[0], MotionTagDataParser.STAY_HEAT_INTENSITY])
			} else {
				const reader = WkbGeometryReader.fromHexString(values[11])
				const geometry = reader.readAll()
				const path: LatLng[] = []

				switch (geometry.type) {
					case 'MultiLineString':
						;(geometry as MultiLineString).coordinates.forEach((lineString) => {
							lineString.forEach((point) => {
								this.positionHeatMap.push([point[1], point[0], MotionTagDataParser.MOVE_HEAT_INTENSITY])
								path.push(new LatLng(point[1], point[0]))
							})
						})
						break

					case 'LineString':
						;(geometry as LineString).coordinates.forEach((point) => {
							this.positionHeatMap.push([point[1], point[0], MotionTagDataParser.MOVE_HEAT_INTENSITY])
							path.push(new LatLng(point[1], point[0]))
						})
						break

					default:
						console.warn('Unexpected Geometry Type: ', geometry.type)
						continue
				}

				this.addToDistanceHeatMap(entry.started_at, parseInt(values[7]), values[9].substring(6))

				this.movements.push({ ...entry, mode: values[9].substring(6), length: parseInt(values[7]), path: path })
			}
		}

		return
	}

	public getStays(): Stay[] {
		return this.stays
	}

	public getMovements(): Movement[] {
		return this.movements
	}

	public getPositionHeatMap(): [number, number, number][] {
		return this.positionHeatMap
	}

	public getDistanceHeatMap() {
		return this.distanceHeatMapByDay
	}

	private addToDistanceHeatMap(dateTime: Date, length: number, mode: string) {
		const date = dateTime.getDate() + '-' + (dateTime.getMonth() + 1) + '-' + dateTime.getFullYear()
		if (this.distanceHeatMapByDay[date] == undefined)
			this.distanceHeatMapByDay[date] = {
				total: 0,
				date: new Date(dateTime.getFullYear(), dateTime.getMonth(), dateTime.getDate()),
			}

		if (this.distanceHeatMapByDay[date][mode] == undefined) this.distanceHeatMapByDay[date][mode] = 0

		this.distanceHeatMapByDay[date][mode] += length
		this.distanceHeatMapByDay[date].total += length
	}
}

export interface Entry {
	id: string
	started_at: Date
	finished_at: Date
}

export interface Stay extends Entry {
	purpose: string
	position: LatLng
}

export interface Movement extends Entry {
	mode: string
	length: number
	path: LatLng[]
}
