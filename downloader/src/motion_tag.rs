use std::error::Error;

use reqwest::{
    blocking::Client,
    header::{HeaderMap, AUTHORIZATION, CONTENT_TYPE, USER_AGENT},
};
use serde_json::Value;

pub struct ApiClient {
    authorized_client: Client,
    base_url: String,
}

impl ApiClient {
    pub fn new_from_user(base_url: &str, username: &str, password: &str) -> ApiClient {
        let client = Client::new();

        let token = get_token(&client, base_url, username, password);

        return ApiClient::new_from_token(base_url, &token.unwrap());
    }

    pub fn new_from_token(base_url: &str, token: &str) -> ApiClient {
        let mut default_headers = HeaderMap::new();

        default_headers.insert(AUTHORIZATION, format!("Bearer {}", token).parse().unwrap());
        default_headers.insert(USER_AGENT, "MotionTag Android, device: Samsung SM-G991B, os_version: 11, app_version: 3.38.80, flavor: motiontag".parse().unwrap());

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
        println!("{}", url);
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
            "Failed to retrieve days. Reponse code: {}",
            response.status()
        )
        .into());
    }

    // #[derive()]
    // struct Storyline {
    //     storyline: Vec<Value>
    // }

    // pub fn get_storyline(client: &Client, base_url: &str, token: &str, date: &str) -> Result<> {

    // }
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

    return Err(format!(
        "Failed to retrieve token. Reponse code: {}",
        response.status()
    )
    .into());
}
