import requests
from bs4 import BeautifulSoup
import time
import json
from datetime import datetime, date, timedelta
import os
from pathlib import Path
import signal
import sys
import threading
from flask import Flask

# ---------------- FLASK APP ----------------
app = Flask(__name__)

@app.route("/")
def home():
    return {"status": "Scraper is running 🚀"}

@app.route("/health")
def health():
    return {"status": "ok"}

# ---------------- CONFIG ----------------
HT_URL = "https://www.hindustantimes.com/india-news"
IE_URL = "https://indianexpress.com/section/india/"

API_URL = os.getenv('API_URL', 'http://localhost:5000')
INGEST_ENDPOINT = f"{API_URL}/api/scraped_blogs/scraped/ingest"

HEADERS = {
    "User-Agent": "Mozilla/5.0"
}

CHECK_INTERVAL = 300
MAX_ARTICLES_PER_RUN = 50

CACHE_DIR = "cache"
CACHE_FILE_TEMPLATE = "sent_articles_{date}.json"
MAX_ARTICLES_PER_DAY = 2000

# ---------------- CACHE ----------------
def get_cache_filename():
    today = date.today().strftime("%Y-%m-%d")
    return os.path.join(CACHE_DIR, CACHE_FILE_TEMPLATE.format(date=today))

def ensure_cache_dir():
    if not os.path.exists(CACHE_DIR):
        os.makedirs(CACHE_DIR)

def cleanup_old_caches():
    try:
        current_time = time.time()
        for cache_file in Path(CACHE_DIR).glob("sent_articles_*.json"):
            if current_time - cache_file.stat().st_mtime > 7 * 24 * 3600:
                cache_file.unlink()
    except:
        pass

def load_cache():
    ensure_cache_dir()
    cleanup_old_caches()
    file = get_cache_filename()
    if os.path.exists(file):
        try:
            with open(file, 'r') as f:
                return set(json.load(f).get('sent_links', []))
        except:
            return set()
    return set()

def save_cache(cache):
    ensure_cache_dir()
    file = get_cache_filename()
    with open(file, 'w') as f:
        json.dump({
            "date": date.today().isoformat(),
            "sent_links": list(cache)
        }, f)

def is_article_sent(link, cache):
    return link in cache

def mark_as_sent(link, cache):
    cache.add(link)
    if len(cache) % 10 == 0:
        save_cache(cache)

# ---------------- CONTENT ----------------
def get_ht_content(url):
    try:
        soup = BeautifulSoup(requests.get(url, headers=HEADERS, timeout=10).text, "html.parser")
        for sel in ["p.content", "article p", ".detail p", ".story-detail p"]:
            for p in soup.select(sel):
                text = p.text.strip()
                if len(text) > 50:
                    return ' '.join(text.split())[:1000]
        return ""
    except:
        return ""

def get_ie_content(url):
    try:
        soup = BeautifulSoup(requests.get(url, headers=HEADERS, timeout=10).text, "html.parser")
        syn = soup.find("h2", class_="synopsis")
        if syn:
            return syn.text.strip()[:1000]
        for sel in ["div.story_details p", "article p", ".full-details p", ".content p"]:
            for p in soup.select(sel):
                text = p.text.strip()
                if len(text) > 50:
                    return ' '.join(text.split())[:1000]
        return ""
    except:
        return ""

# ---------------- SCRAPERS ----------------
def scrape_ht():
    news = []
    try:
        soup = BeautifulSoup(requests.get(HT_URL, headers=HEADERS).text, "html.parser")
        for art in soup.select("article")[:MAX_ARTICLES_PER_RUN]:
            a = art.find("a")
            if not a: continue
            title = a.text.strip()
            link = a.get("href")
            if link and not link.startswith("http"):
                link = "https://www.hindustantimes.com" + link
            if title and link:
                news.append({"source": "Hindustan Times", "title": title, "link": link})
    except:
        pass
    return news

def scrape_ie():
    news = []
    try:
        soup = BeautifulSoup(requests.get(IE_URL, headers=HEADERS).text, "html.parser")
        for art in soup.select("article")[:MAX_ARTICLES_PER_RUN]:
            a = art.find("a")
            if not a: continue
            title = a.text.strip()
            link = a.get("href")
            if link and not link.startswith("http"):
                link = "https://indianexpress.com" + link
            if title and link:
                news.append({"source": "Indian Express", "title": title, "link": link})
    except:
        pass
    return news

# ---------------- SEND ----------------
def send_to_backend(articles, cache):
    for article in articles:
        if is_article_sent(article["link"], cache):
            continue
        try:
            summary = get_ht_content(article["link"]) if article["source"] == "Hindustan Times" else get_ie_content(article["link"])
            article["summary"] = summary

            r = requests.post(INGEST_ENDPOINT, json=article, timeout=10)
            if r.status_code in [200, 201]:
                mark_as_sent(article["link"], cache)

            time.sleep(0.5)
        except:
            pass
    save_cache(cache)

# ---------------- SYNC ----------------
def sync_news():
    print(f"[{datetime.now()}] Running sync...")
    cache = load_cache()

    ht = scrape_ht()
    ie = scrape_ie()

    all_news = (ht + ie)[:MAX_ARTICLES_PER_RUN]
    new_articles = [a for a in all_news if not is_article_sent(a["link"], cache)]

    if new_articles:
        send_to_backend(new_articles, cache)
        print(f"✅ Sent {len(new_articles)} articles")
    else:
        print("📭 No new articles")

# ---------------- BACKGROUND THREAD ----------------
def run_scraper():
    print("🚀 Background scraper started")
    while True:
        try:
            sync_news()
            next_run = datetime.now() + timedelta(seconds=CHECK_INTERVAL)
            print(f"💤 Next run at {next_run.strftime('%H:%M:%S')}")
            time.sleep(CHECK_INTERVAL)
        except Exception as e:
            print("Error:", e)
            time.sleep(10)

# ---------------- START BACKGROUND THREAD ----------------
def start_background():
    t = threading.Thread(target=run_scraper)
    t.daemon = True
    t.start()

# Start immediately when app loads (IMPORTANT for gunicorn)
start_background()

# ---------------- LOCAL RUN ----------------
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)