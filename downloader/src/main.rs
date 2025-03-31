use std::{error::Error, process::exit};

use clap::Parser;
use reqwest::{
    blocking::Client,
    header::{HeaderMap, AUTHORIZATION, CONTENT_TYPE, USER_AGENT},
};
use serde_json::Value;

#[derive(Parser, Debug)]
#[command(about, long_about = None)]
struct Args {
    #[arg(short, long, default_value = "")]
    username: String,

    #[arg(short, long, default_value = "")]
    password: String,

    #[arg(short, long, default_value = "")]
    token: String,

    #[arg(long, default_value = "https://api.motion-tag.de/api")]
    url: String,
}

fn main() {
    let args = Args::parse();

    let mut token = "".to_string();

    let mut default_headers = HeaderMap::new();
    default_headers.insert(USER_AGENT, "MotionTag Android, device: Samsung SM-G991B, os_version: 11, app_version: 3.38.80, flavor: motiontag".parse().unwrap());

    let client = Client::builder()
        .default_headers(default_headers)
        .build()
        .unwrap();

    if args.token == "" {
        if args.username == "" || args.password == "" {
            eprintln!("Username and password is missing.");
            exit(1);
        }
        match get_token(&client, &args.url, &args.username, &args.password) {
            Ok(t) => {
                token += &t;
            }
            Err(err) => {
                eprintln!("Error: {}", err);
                exit(1);
            }
        }
    } else {
        token = args.token;
    }

    let days_result = get_days(&client, &args.url, &token);

    if days_result.is_err() {
        eprintln!("Error: {}", days_result.err().unwrap());
        exit(1);
    }

    let _dates = days_result.unwrap();

    println!("Total days: {}", _dates.len());
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

fn get_days(client: &Client, base_url: &str, token: &str) -> Result<Vec<String>, Box<dyn Error>> {
    let url = format!("{}/days", base_url);

    let response = client
        .get(url)
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .send()?;

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

    return Err(format!("Failed to retrieve days. Reponse code: {}", -1).into());
}
