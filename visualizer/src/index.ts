import { Control, LatLng, LayerGroup, Map as LeafletMap, Marker, Polyline, TileLayer } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { DailyDistanceHeatMap, type Entry } from './DailyDistanceHeatMap'
import { getColorForMode, getIconForPurpose } from './constants'
import { VisualizeControl } from './controls/VisualizeControl'
import './index.css'
import { MotionTagDataParser } from './parser/motionTagDataParser'
import { GroupedTreeMap } from './GroupedTreeMap'

const parser = new MotionTagDataParser()
const dailyDistance = new DailyDistanceHeatMap('#heat', {
	onSelect: showTracksForSelectedDate,
})

const treeMap = new GroupedTreeMap('#distribution')
dailyDistance.drawInitial();

const map = new LeafletMap('map', {
	zoom: 7,
	center: new LatLng(51.4, 10.0), // Center of germany
})

const osmTileMap = new TileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
	maxZoom: 19,
	attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
})

const cartoDbTileMap = new TileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
	attribution:
		'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
	subdomains: 'abcd',
	maxZoom: 20,
})

const esriTileMap = new TileLayer(
	'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
	{
		attribution:
			'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community',
	},
)

const visualizeControl = new VisualizeControl({})
const layerControl = new Control.Layers({ OpenStreetMap: osmTileMap, CARTO: cartoDbTileMap, ESRI: esriTileMap }, {}, {})

const routeHeatMapLayer = new LayerGroup()
const layerGroups: { [key: string]: LayerGroup } = {}
const polyLines: { [key: string]: Polyline[] } = {}
const markers: Marker[] = []

osmTileMap.addTo(map)
visualizeControl.addTo(map)
layerControl.addTo(map)
layerControl.setPosition('topleft')
routeHeatMapLayer.addTo(map)

function showTracksForSelectedDate(entry: Entry | null) {
	for (const [key, modePolyLines] of Object.entries(polyLines)) {
		for (const polyLine of modePolyLines) {
			polyLine.remove()
		}
		delete polyLines[key]
	}
	for (const [key, layerGroup] of Object.entries(layerGroups)) {
		layerGroup.remove()
		layerControl.removeLayer(layerGroup)
		delete layerGroups[key]
	}
	markers.length = 0

	if (entry == null) {
		routeHeatMapLayer.addTo(map)
		return
	}

	routeHeatMapLayer.removeFrom(map)

	const dayMovements = parser
		.getMovements()
		.filter((movement) => movement.started_at.toDateString() === entry.date.toDateString())

	const dayStays = parser.getStays().filter((stay) => stay.started_at.toDateString() === entry.date.toDateString())

	if (!Object.keys(layerGroups).find((v) => v === 'Stays')) {
		layerGroups['Stays'] = new LayerGroup([], {})
		layerControl.addOverlay(layerGroups['Stays'], 'Stays')
		layerGroups['Stays'].addTo(map)
	}

	for (const stay of dayStays) {
		markers.push(
			new Marker(stay.position, { icon: getIconForPurpose(stay.purpose) })
				.bindPopup(JSON.stringify(stay))
				.addTo(layerGroups['Stays']),
		)
	}

	for (const movement of dayMovements) {
		if (!Object.keys(layerGroups).find((v) => v === movement.mode)) {
			layerGroups[movement.mode] = new LayerGroup([], {})
			layerGroups[movement.mode].addTo(map)

			polyLines[movement.mode] = []

			layerControl.addOverlay(layerGroups[movement.mode], movement.mode)
		}

		polyLines[movement.mode].push(
			new Polyline(movement.path, {
				color: getColorForMode(movement.mode),
				weight: 5,
			})
				.bindPopup(JSON.stringify({ ...movement, path: [] }))
				.addTo(layerGroups[movement.mode]),
		)
	}
}

export async function setData(d: string) {
	const start = Date.now()

	await parser.parse(d)

	console.log('Parsing data took', `${Date.now() - start}ms`)

	dailyDistance.setData(Object.values(parser.getDistanceHeatMap()))
	treeMap.setData(parser.getMovements())

	// "HeatMap"
	for (const movement of parser.getMovements()) {
		new Polyline(movement.path, {
			opacity: 0.1,
			color: getColorForMode(movement.mode),
			weight: 6,
			interactive: false,
		}).addTo(routeHeatMapLayer)
	}
}
