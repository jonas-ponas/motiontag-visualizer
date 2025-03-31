// Ref.: https://libgeos.org/specifications/wkb/

import { GeoJsonObject, LineString, MultiLineString, Point } from 'geojson'

export class WkbGeometryReader {
	// Geometry Types
	public static Point = 0x00000001
	private static LineString = 0x00000002
	private static Polygon = 0x00000003
	private static MultiPoint = 0x00000004
	private static MultiLineString = 0x00000005
	private static MultiPolygon = 0x00000006
	private static GeometryCollection = 0x00000007

	// Modifiers
	private static WithZ = 0x80000000
	private static WithM = 0x40000000
	public static WithSRID = 0x20000000

	private bytes: Uint8Array
	private dataView: DataView
	private cursor = 0

	private littleEndian = false

	constructor(bytes: Uint8Array) {
		this.bytes = bytes
		this.dataView = new DataView(this.bytes.buffer)
		let byteOrder = this.readByte()
		if (byteOrder == 1) {
			this.littleEndian = true
		} else {
			this.littleEndian = false
		}
	}

	public static fromHexString(data: string): WkbGeometryReader {
		let chunk = data.split('').reduce((totalBytes, _, index, hexData) => {
			if (index % 2 == 0) {
				let num = (parseInt(hexData[index], 16) << 4) + parseInt(hexData[index + 1], 16)
				totalBytes[index / 2] = num
				return totalBytes
			} else {
				return totalBytes
			}
		}, new Uint8Array(data.length / 2))

		return new WkbGeometryReader(chunk)
	}

	private readByte(): number {
		let byte = this.bytes[this.cursor]
		this.cursor += 1
		return byte
	}

	private readLong(): number {
		const long = this.dataView.getInt32(this.cursor, this.littleEndian)
		this.cursor += 4
		return long
	}

	private readDouble(): number {
		const float = this.dataView.getFloat64(this.cursor, this.littleEndian)
		this.cursor += 8
		return float
	}

	private readPosition(): number[] {
		return [this.readDouble(), this.readDouble()]
	}

	private readWkbPoint(): Point {
		const result = { type: 'Point', coordinates: [] } as Point
		this.readByte() // Endianness
		const type = this.readLong()
		if ((type & 0x000000ff) != WkbGeometryReader.Point) throw new Error('Illegal State')

		if ((type & 0xff000000) == WkbGeometryReader.WithSRID) this.readLong() // Result can be ignored

		result.coordinates.push(this.readDouble())
		result.coordinates.push(this.readDouble())

		return result
	}

	private readWkbLineString(): LineString {
		const result = { type: 'LineString' } as LineString
		this.readByte() // Endianness
		const type = this.readLong()
		if ((type & 0x000000ff) != WkbGeometryReader.LineString) throw new Error('Illegal State')

		if ((type & 0xff000000) == WkbGeometryReader.WithSRID) this.readLong() // Result can be ignored

		const numPoints = this.readLong()
		result.coordinates = []

		for (let i = 0; i < numPoints; i++) {
			result.coordinates.push(this.readPosition())
		}

		return result
	}

	private readWkbMultiLineString(): MultiLineString {
		const result = { type: 'MultiLineString' } as MultiLineString
		this.readByte() // Endianness
		const type = this.readLong()
		if ((type & 0x000000ff) != WkbGeometryReader.MultiLineString) throw new Error('Illegal State')

		if ((type & 0xff000000) == WkbGeometryReader.WithSRID) this.readLong() // Result can be ignored

		const numLineStrings = this.readLong()
		result.coordinates = []

		for (let i = 0; i < numLineStrings; i++) {
			result.coordinates.push(this.readWkbLineString().coordinates)
		}

		return result
	}

	public readAll(): GeoJsonObject {
		let result = {} as GeoJsonObject
		const type = this.readLong()
		if ((type & 0xff0000000) == WkbGeometryReader.WithSRID) this.readLong()

		this.cursor = 0

		switch (type & 0x000000ff) {
			case WkbGeometryReader.Point:
				result = { ...result, ...this.readWkbPoint() }
				break
			case WkbGeometryReader.LineString:
				result = { ...result, ...this.readWkbLineString() }
				break
			case WkbGeometryReader.MultiLineString:
				result = { ...result, ...this.readWkbMultiLineString() }
				break
			default:
				console.log('Unsupported Geometry Type: ' + (type & 0x000000ff))
		}

		return result
	}
}
