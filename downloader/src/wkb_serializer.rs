use std::io::{Cursor, Write};

use serde_json::Value;

pub fn geojson_to_wkb(geojson: &Value) -> String {
    let mut buf = Cursor::new(Vec::new());

    let typ = geojson.get("type").unwrap().as_str().unwrap();

    buf.write_all(&0u8.to_be_bytes()).ok();

    match typ {
        "Point" => {
            let coordinates = geojson["coordinates"].as_array().unwrap();
            write_point(
                &mut buf,
                &coordinates[0].as_f64().unwrap(),
                &coordinates[1].as_f64().unwrap(),
            );
        }
        "LineString" => {
            let points: Vec<Vec<f64>> = geojson["coordinates"]
                .as_array()
                .unwrap()
                .to_vec()
                .iter()
                .map(|inner_value| value_to_vecf64(inner_value))
                .collect();
            write_linestring(&mut buf, points);
        }
        "MultiLineString" => {
            // TODO: implement MultiLineString!
            println!("Unsupported Type: {}", typ);
            return String::default();
        }
        _ => {
            println!("Unsupported Type: {}", typ);
            return String::default();
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

fn write_linestring(buf: &mut Cursor<Vec<u8>>, points: Vec<Vec<f64>>) {
    buf.write_all(&2u32.to_be_bytes()).ok(); // 0x00000002

    buf.write_all(&(points.len() as u32).to_be_bytes()).ok();

    for point in points {
        assert!(point.len() == 2);

        buf.write_all(&point[0].to_be_bytes()).ok();
        buf.write_all(&point[1].to_be_bytes()).ok();
    }
}

fn value_to_vecf64(json: &Value) -> Vec<f64> {
    json.as_array()
        .unwrap()
        .to_vec()
        .iter()
        .map(|inner_value| inner_value.as_f64().unwrap())
        .collect()
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
