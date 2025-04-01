mod motion_tag;

use std::process::exit;

use clap::Parser;
use motion_tag::ApiClient;

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

    let client = if args.token == "" {
        if args.username == "" || args.password == "" {
            eprintln!("Username and password is missing.");
            exit(1);
        }
        ApiClient::new_from_user(&args.url, &args.username, &args.password)
    } else {
        ApiClient::new_from_token(&args.url, &args.token)
    };

    let days_result = client.get_days();

    if days_result.is_err() {
        eprintln!("Error: {}", days_result.err().unwrap());
        exit(1);
    }

    let _dates = days_result.unwrap();

    println!("Total days: {}", _dates.len());
}