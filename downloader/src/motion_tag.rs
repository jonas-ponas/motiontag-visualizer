use std::error::Error;

use reqwest::{
    blocking::Client,
    header::{HeaderMap, AUTHORIZATION, CONTENT_TYPE, USER_AGENT},
};
use serde::Deserialize;
use serde_json::Value;

use crate::wkb_serializer;

pub struct ApiClient {
    authorized_client: Client,
    base_url: String,
}

impl ApiClient {
    pub fn new_from_user(base_url: &str, username: &str, password: &str) -> ApiClient {
        let client = Client::new();

        let result = get_token(&client, base_url, username, password);

        let token = result.unwrap();

        println!("Consider using this token for future requests: {}", token);

        return ApiClient::new_from_token(base_url, &token);
    }

    pub fn new_from_token(base_url: &str, token: &str) -> ApiClient {
        let mut default_headers = HeaderMap::new();

        default_headers.insert(AUTHORIZATION, format!("Bearer {}", token).parse().unwrap());
        default_headers.insert(USER_AGENT, "MotionTag Android, device: Samsung SM-G991B, os_version: 11, app_version: 3.38.80, flavor: motiontag".parse().unwrap()); // desperate try to blend in with API calls from the app

        let authorized_client = Client::builder()
            .default_headers(default_headers)
            .build()
            .unwrap();

        return ApiClient {
            authorized_client: authorized_client,
            base_url: base_url.to_string(),
        };
    }

    pub fn get_days(&self) -> Result<Vec<String>, Box<dyn Error>> {
        let url = format!("{}/days", self.base_url);

        let response = self.authorized_client.get(url).send()?;

        if response.status().is_success() {
            let body: Value = response.json()?;

            let days = body.get("days").unwrap().as_array().unwrap();
            let dates = days
                .iter()
                .map(|day| {
                    day.get("date")
                        .unwrap()
                        .as_str()
                        .unwrap_or_default()
                        .to_owned()
                })
                .collect::<Vec<String>>();

            return Ok(dates);
        }

        return Err(format!(
            "Failed to retrieve days. Response code: {}",
            response.status()
        )
        .into());
    }

    pub fn get_storyline(&self, date: &str) -> Result<Vec<StorylineItem>, Box<dyn Error>> {
        let url = format!("{}/storyline/{}", self.base_url, date);

        let response = self.authorized_client.get(url).send()?;

        if response.status().is_success() {
            let body: Value = response.json()?;
            let items: Vec<StorylineItem> =
                serde_json::from_value(body.get("storyline").unwrap().to_owned()).unwrap();

            return Ok(items);
        }

        Err(format!(
            "Failed to retrieve days. Response code: {}",
            response.status()
        ).into())
    }
}


#[derive(Debug, Deserialize)]
#[serde(tag = "type", content = "coordinates")]
pub enum GeoJson {
    Point((f64, f64)),
    LineString(Vec<(f64, f64)>),
    // MultiLineString is not supported yet
    MultiLineString(#[allow(unused)] Vec<Vec<(f64, f64)>>),
}

#[derive(Default, Deserialize)]
pub struct StorylineItem {
    #[serde(rename = "type")]
    pub typ: String,
    pub started_at: String,
    pub finished_at: String,
    pub uuid: String,
    pub length: Option<i64>,
    pub mode: Option<String>,
    // pub confirmed: bool,
    // pub belongs_to_previous: Option<bool>,
    pub geometry: Option<GeoJson>,
    pub purpose: Option<String>,
}

impl StorylineItem {
    pub fn to_csv_line(&self) -> String {
        let geometry = self.geometry.as_ref()
            .map(|geometry| wkb_serializer::geojson_to_wkb(geometry))
            .unwrap_or_default();

        format!(
            "{};;{};{};;{};;{};;{};{};{};;;;;;;;;;;;",
            self.uuid,
            self.typ,
            self.started_at,
            self.finished_at,
            self.length.unwrap_or_default(),
            self.mode.clone().unwrap_or_default(),
            self.purpose.clone().unwrap_or_default(),
            geometry
        )
    }

    pub fn csv_headline() -> String {
        "id;user_id;type;started_at;started_at_timezone;finished_at;finished_at_timezone;length;detected_mode;mode;purpose;geometry;confirmed_at;started_on;misdetected_completely;merged;created_at;updated_at;started_at_in_timezone;finished_at_in_timezone;confirmed_at_in_timezone;created_at_in_timezone;updated_at_in_timezone;comment_feedback".to_string()
    }
}

fn get_token(
    client: &Client,
    base_url: &str,
    username: &str,
    password: &str,
) -> Result<String, Box<dyn Error>> {
    let json = format!(
        "{{\"grant_type\":\"password\",\"password\":\"{}\",\"username\":\"{}\"}}",
        password, username
    );

    let url = format!("{}/token", base_url);

    let response = client
        .post(url)
        .header(CONTENT_TYPE, "application/json")
        .body(json)
        .send()?;

    if response.status().is_success() {
        let body: Value = response.json()?;

        let token = body.get("access_token").unwrap().as_str().unwrap();

        return Ok(token.to_string());
    }

    Err(format!(
        "Failed to retrieve token. Reponse code: {}",
        response.status()
    )
    .into())
}
