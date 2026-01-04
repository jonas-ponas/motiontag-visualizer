mod motion_tag;
mod wkb_serializer;

use std::{fs, process::exit};

use clap::Parser;
use motion_tag::{ApiClient, StorylineItem};

#[derive(Parser, Debug)]
#[command(about, long_about = None)]
struct Args {
    #[arg(short, long, default_value = "")]
    username: String,

    #[arg(short, long, default_value = "")]
    password: String,

    #[arg(short, long, default_value = "")]
    token: String,

    #[arg(long)]
    from: Option<String>,

    #[arg(long)]
    to: Option<String>,

    #[arg(short, long, default_value = "./motiontag_export.csv")]
    out_file: String,

    #[arg(long, default_value = "https://api.motion-tag.de/api")]
    url: String,
}

fn main() {
    let args = Args::parse();

    let client = if args.token.is_empty() {
        if args.username.is_empty()|| args.password.is_empty() {
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

    let dates = days_result.unwrap();

    println!("Total days: {}", dates.len());

    let mut from_reached = true;

    if args.from.is_some() {
        from_reached = false;
    }

    let mut csv_lines: Vec<String> = Vec::new();

    csv_lines.push(StorylineItem::csv_headline());

    for date in dates {
        if args.from.clone().is_some_and(|from| from == date) {
            println!("reached start of specified duration at '{}'", date);
            from_reached = true;
        }

        if !from_reached {
            continue;
        }

        println!("getting data for '{}'", date);

        let storyline = client.get_storyline(&date).unwrap();

        for item in storyline {
            if item.typ == "Track" || item.typ == "Stay" {
                csv_lines.push(item.to_csv_line());
            }
        }

        if args.to.clone().is_some_and(|to| to == date) {
            println!("reached end of specified duration at '{}'", date);
            break;
        }
    }

    fs::write(args.out_file, csv_lines.join("\n")).expect("Failed to write file");
}
