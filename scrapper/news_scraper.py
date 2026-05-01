import requests
from bs4 import BeautifulSoup
import time
import json
from datetime import datetime, date
import os
import hashlib
from pathlib import Path
import signal
import sys

# ---------------- CONFIG ----------------
HT_URL = "https://www.hindustantimes.com/india-news"
IE_URL = "https://indianexpress.com/section/india/"

# Your backend API URL
API_URL = os.getenv('API_URL', 'http://localhost:5000')
INGEST_ENDPOINT = f"{API_URL}/api/scraped_blogs/scraped/ingest"
BULK_ENDPOINT = f"{API_URL}/api/scraped_blogs/scraped/bulk-ingest"

HEADERS = {
    "User-Agent": "Mozilla/5.0"
}

CHECK_INTERVAL = 300  # 5 minutes
MAX_ARTICLES_PER_RUN = 50

# Cache configuration
CACHE_DIR = "cache"
CACHE_FILE_TEMPLATE = "sent_articles_{date}.json"
MAX_ARTICLES_PER_DAY = 2000  # Max articles to store per day

# ---------------- CACHE MANAGEMENT ----------------
def get_cache_filename():
    """Get cache filename for today's date"""
    today = date.today().strftime("%Y-%m-%d")
    return os.path.join(CACHE_DIR, CACHE_FILE_TEMPLATE.format(date=today))

def ensure_cache_dir():
    """Create cache directory if it doesn't exist"""
    if not os.path.exists(CACHE_DIR):
        os.makedirs(CACHE_DIR)
        print(f"📁 Created cache directory: {CACHE_DIR}")

def cleanup_old_caches():
    """Delete cache files older than 7 days"""
    try:
        current_time = time.time()
        cache_dir = Path(CACHE_DIR)
        
        for cache_file in cache_dir.glob("sent_articles_*.json"):
            # Check if file is older than 7 days
            file_age = current_time - cache_file.stat().st_mtime
            if file_age > 7 * 24 * 3600:  # 7 days
                cache_file.unlink()
                print(f"🗑️ Deleted old cache: {cache_file.name}")
    except Exception as e:
        print(f"Error cleaning old caches: {e}")

def load_cache():
    """Load today's cache of already sent articles"""
    ensure_cache_dir()
    cleanup_old_caches()
    
    cache_file = get_cache_filename()
    
    if os.path.exists(cache_file):
        try:
            with open(cache_file, 'r', encoding='utf-8') as f:
                cache_data = json.load(f)
                cache_set = set(cache_data.get('sent_links', []))
                print(f"📂 Loaded cache from {os.path.basename(cache_file)}: {len(cache_set)} articles")
                return cache_set
        except Exception as e:
            print(f"Error loading cache: {e}")
            return set()
    else:
        print(f"📅 Starting fresh cache for {date.today()}")
        return set()

def save_cache(cache_set):
    """Save today's cache of sent articles"""
    ensure_cache_dir()
    
    cache_file = get_cache_filename()
    
    # Trim cache if too large
    if len(cache_set) > MAX_ARTICLES_PER_DAY:
        # Keep only the most recent MAX_ARTICLES_PER_DAY
        cache_list = list(cache_set)[-MAX_ARTICLES_PER_DAY:]
    else:
        cache_list = list(cache_set)
    
    cache_data = {
        'date': date.today().isoformat(),
        'sent_links': cache_list,
        'total_count': len(cache_list),
        'last_updated': datetime.now().isoformat()
    }
    
    try:
        with open(cache_file, 'w', encoding='utf-8') as f:
            json.dump(cache_data, f, indent=2)
        print(f"💾 Saved cache: {len(cache_list)} articles for {date.today()}")
    except Exception as e:
        print(f"Error saving cache: {e}")

def is_article_sent(link, cache):
    """Check if article has already been sent today"""
    return link in cache

def mark_as_sent(link, cache):
    """Mark article as sent"""
    cache.add(link)
    # Save cache every 10 articles to avoid losing data
    if len(cache) % 10 == 0:
        save_cache(cache)

def should_reset_cache():
    """Check if we should reset cache (new day)"""
    cache_file = get_cache_filename()
    return not os.path.exists(cache_file)

# ---------------- CONTENT SCRAPERS ----------------
def get_ht_content(url):
    try:
        res = requests.get(url, headers=HEADERS, timeout=10)
        soup = BeautifulSoup(res.text, "html.parser")

        # Try different paragraph selectors
        paragraphs = soup.find_all("p", class_="content")
        
        if not paragraphs:
            paragraphs = soup.select("article p")
        
        if not paragraphs:
            paragraphs = soup.select(".detail p")
            
        if not paragraphs:
            paragraphs = soup.select(".story-detail p")
            
        for p in paragraphs:
            text = p.text.strip()
            if len(text) > 50:
                # Clean up the text
                text = ' '.join(text.split())
                return text[:1000]  # Limit length

        return ""

    except Exception as e:
        print(f"HT content error: {e}")
        return ""

def get_ie_content(url):
    try:
        res = requests.get(url, headers=HEADERS, timeout=10)
        soup = BeautifulSoup(res.text, "html.parser")

        # Try synopsis first
        synopsis = soup.find("h2", class_="synopsis")
        if synopsis:
            text = synopsis.text.strip()
            return text[:1000]

        # Try main content
        paragraphs = soup.select("div.story_details p")
        
        if not paragraphs:
            paragraphs = soup.select("article p")
            
        if not paragraphs:
            paragraphs = soup.select(".full-details p")
            
        if not paragraphs:
            paragraphs = soup.select(".content p")

        for p in paragraphs:
            text = p.text.strip()
            if len(text) > 50:
                text = ' '.join(text.split())
                return text[:1000]

        return ""

    except Exception as e:
        print(f"IE content error: {e}")
        return ""

# ---------------- LIST SCRAPERS ----------------
def scrape_ht():
    news = []
    try:
        res = requests.get(HT_URL, headers=HEADERS, timeout=10)
        soup = BeautifulSoup(res.text, "html.parser")

        articles = soup.find_all("div", class_="cartHolder")
        
        if not articles:
            articles = soup.select("article")
            
        if not articles:
            articles = soup.select(".story-card")

        for art in articles[:MAX_ARTICLES_PER_RUN]:
            title_tag = art.find("h2", class_="hdg3")
            if not title_tag:
                title_tag = art.find("h2")
            if not title_tag:
                title_tag = art.find("h3")
            if not title_tag:
                continue

            a_tag = title_tag.find("a")
            if not a_tag:
                continue

            title = a_tag.text.strip()
            link = a_tag.get("href")
            
            # Ensure full URL
            if link and not link.startswith('http'):
                link = 'https://www.hindustantimes.com' + link

            time_tag = art.find("div", class_="dateTime")
            if not time_tag:
                time_tag = art.find("time")
            timestamp = time_tag.text.strip() if time_tag else ""

            if link and title:
                news.append({
                    "source": "Hindustan Times",
                    "title": title,
                    "link": link,
                    "time": timestamp
                })

    except Exception as e:
        print("HT scrape error:", e)

    return news

def scrape_ie():
    news = []
    try:
        res = requests.get(IE_URL, headers=HEADERS, timeout=10)
        soup = BeautifulSoup(res.text, "html.parser")

        articles = soup.find_all("div", class_="articles")
        
        if not articles:
            articles = soup.select("article")
            
        if not articles:
            articles = soup.select(".story-card")

        for art in articles[:MAX_ARTICLES_PER_RUN]:
            title_tag = art.find("h2", class_="title")
            if not title_tag:
                title_tag = art.find("h2")
            if not title_tag:
                title_tag = art.find("h3")
            if not title_tag:
                continue

            a_tag = title_tag.find("a")
            if not a_tag:
                continue

            title = a_tag.text.strip()
            link = a_tag.get("href")
            
            # Ensure full URL
            if link and not link.startswith('http'):
                link = 'https://indianexpress.com' + link

            date_tag = art.find("div", class_="date")
            if not date_tag:
                date_tag = art.find("time")
            timestamp = date_tag.text.strip() if date_tag else ""

            if link and title:
                news.append({
                    "source": "Indian Express",
                    "title": title,
                    "link": link,
                    "time": timestamp
                })

    except Exception as e:
        print("IE scrape error:", e)

    return news

# ---------------- SEND TO BACKEND ----------------
def send_to_backend(articles, cache):
    """Send only new articles to backend"""
    added_count = 0
    skipped_count = 0
    failed_count = 0
    
    for idx, article in enumerate(articles, 1):
        # Check if already sent today
        if is_article_sent(article["link"], cache):
            skipped_count += 1
            continue
            
        try:
            print(f"[{idx}/{len(articles)}] 📝 Fetching: {article['title'][:50]}...")
            
            # Fetch full content
            if article["source"] == "Hindustan Times":
                summary = get_ht_content(article["link"])
            else:
                summary = get_ie_content(article["link"])
            
            article["summary"] = summary
            
            # Send to backend
            response = requests.post(
                INGEST_ENDPOINT,
                json=article,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            if response.status_code in [200, 201]:
                added_count += 1
                mark_as_sent(article["link"], cache)
                print(f"   ✅ Sent successfully")
            else:
                failed_count += 1
                print(f"   ❌ Failed - Status: {response.status_code}")
                if response.status_code == 500:
                    print(f"   Error: {response.text[:200]}")
                
            time.sleep(0.5)  # Rate limiting
            
        except Exception as e:
            failed_count += 1
            print(f"   ❌ Error: {e}")
    
    # Final cache save
    save_cache(cache)
    
    if skipped_count > 0:
        print(f"⏭️ Skipped {skipped_count} already-sent articles")
    if failed_count > 0:
        print(f"❌ Failed to send {failed_count} articles")
    
    return added_count

# ---------------- STATISTICS ----------------
def show_daily_stats(cache):
    """Show daily statistics"""
    print("\n" + "="*60)
    print("📊 Daily Statistics")
    print("="*60)
    print(f"📅 Date: {date.today()}")
    print(f"📰 Articles sent today: {len(cache)}")
    print(f"💾 Cache file: {os.path.basename(get_cache_filename())}")
    print("="*60 + "\n")

# ---------------- SYNC ENGINE ----------------
def sync_news():
    print(f"\n{'='*60}")
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Starting sync cycle")
    print(f"{'='*60}")
    
    # Check if we need to reset cache for new day
    if should_reset_cache():
        print("📅 New day detected! Starting fresh cache...")
    
    # Load today's cache
    cache = load_cache()
    show_daily_stats(cache)

    try:
        print("📰 Scraping Hindustan Times...")
        ht_news = scrape_ht()
        print(f"   Found {len(ht_news)} articles")
        
        print("📰 Scraping Indian Express...")
        ie_news = scrape_ie()
        print(f"   Found {len(ie_news)} articles")
        
        # Combine and limit
        all_news = (ht_news + ie_news)[:MAX_ARTICLES_PER_RUN]
        
        if all_news:
            # Filter out already sent articles
            new_articles = [a for a in all_news if not is_article_sent(a["link"], cache)]
            
            if new_articles:
                print(f"\n🆕 Found {len(new_articles)} new articles out of {len(all_news)} total")
                print(f"📤 Sending to backend...\n")
                
                added = send_to_backend(new_articles, cache)
                
                print(f"\n✅ Sync complete: {added} new articles added today")
                print(f"📊 Total for today: {len(cache)} articles")
            else:
                print(f"\n📭 No new articles found (all {len(all_news)} articles already sent today)")
        else:
            print("⚠️ No articles found from either source")
            
    except Exception as e:
        print(f"❌ Sync error: {e}")
        import traceback
        traceback.print_exc()

# ---------------- GRACEFUL SHUTDOWN ----------------
def signal_handler(sig, frame):
    print("\n\n🛑 Shutting down gracefully...")
    print("💾 Saving final cache...")
    # Cache is already saved, but just in case
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

# ---------------- RUN LOOP ----------------
if __name__ == "__main__":
    print("="*60)
    print("🚀 News Scraper Started with Daily Cache Reset")
    print("="*60)
    print(f"📡 Backend API: {API_URL}")
    print(f"📁 Cache directory: {CACHE_DIR}")
    print(f"⏱️ Check interval: {CHECK_INTERVAL} seconds ({CHECK_INTERVAL//60} minutes)")
    print(f"📅 Cache resets daily at midnight")
    print(f"🗑️ Old caches auto-deleted after 7 days")
    print("="*60)
    
    # Test backend connection
    try:
        response = requests.get(f"{API_URL}/api/health", timeout=5)
        if response.status_code == 200:
            print("✅ Backend is reachable")
        else:
            print(f"⚠️ Backend returned status {response.status_code}")
    except Exception as e:
        print(f"❌ Cannot reach backend: {e}")
        print("   Make sure your backend is running on port 5000")
        exit(1)
    
    print("\n✨ Press Ctrl+C to stop the scraper\n")
    
    # Run once immediately
    sync_news()
    
    # Then run in loop
    while True:
        print(f"\n💤 Sleeping for {CHECK_INTERVAL} seconds...")
        print(f"   Next run at: {(datetime.now().timestamp() + CHECK_INTERVAL)}")
        time.sleep(CHECK_INTERVAL)
        sync_news()