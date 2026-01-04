use std::io::{Cursor, Write};

use crate::motion_tag::GeoJson;

pub fn geojson_to_wkb(geojson: &GeoJson) -> String {
    let mut buf = Cursor::new(Vec::new());
    buf.write(&[0]).unwrap();
    
    match geojson {
        GeoJson::Point(( lat, lan)) => write_point(&mut buf,lat, lan),
        GeoJson::LineString(coordinates  )=> write_linestring(&mut buf, coordinates),
        GeoJson::MultiLineString(_) => {
            todo!("MultiLineString is not supported yet");
        }
    }
    buf.into_inner()
        .iter()
        .map(|byte| format!("{:02X}", byte).to_lowercase())
        .collect()
}

fn write_point(buf: &mut Cursor<Vec<u8>>, lat: &f64, lon: &f64) {
    buf.write_all(&1u32.to_be_bytes()).ok(); // 0x00000001

    buf.write_all(&lat.to_be_bytes()).ok();
    buf.write_all(&lon.to_be_bytes()).ok();
}

fn write_linestring(buf: &mut Cursor<Vec<u8>>, points: &Vec<(f64, f64)>) {
    buf.write_all(&2u32.to_be_bytes()).ok(); // 0x00000002

    buf.write_all(&(points.len() as u32).to_be_bytes()).ok();

    for (lat, lon) in points {
        buf.write_all(&lat.to_be_bytes()).ok();
        buf.write_all(&lon.to_be_bytes()).ok();
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn test_point() {
        let expected = "00000000014021670ab1639dea40490d30eae44d71";

        let geojson = r#"{
            "type":"Point",
            "coordinates":[8.701253455553303,50.10305534503539]
        }"#;

        let result = geojson_to_wkb(&serde_json::from_str(geojson).unwrap());

        assert_eq!(result, expected)
    }

    #[test]
    fn test_linestring() {
        let expected = "00000000020000000740216712ac8a7c1040490d396815cb77402166d34fb9184440490d2b491f6128402166cdd3d8b84a40490d2b471e9498402166ab0ec2256d40490d28aad3469d402166ab0faab85d40490d28aa3b7800402166ab0e3273b040490d28aa25a32c402166e568a5050840490d095ffb125a";

        let geojson = r#"{
            "type": "LineString",
            "coordinates": [
                [ 8.701314346222745, 50.103314409868226 ],
                [ 8.700830928177432, 50.10288347274974 ],
                [ 8.700789089398445, 50.10288323395906 ],
                [ 8.700523816298949, 50.1028035670872 ],
                [ 8.700523843374123, 50.10280349639652 ],
                [ 8.700523799570732, 50.1028034862305 ],
                [ 8.700969, 50.1018486 ]
            ]
        }"#;

        let result = geojson_to_wkb(&serde_json::from_str(geojson).unwrap());

        assert_eq!(result, expected);
    }
}
