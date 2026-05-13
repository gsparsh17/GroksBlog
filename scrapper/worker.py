import requests
from bs4 import BeautifulSoup
import time
import json
from datetime import datetime, date, timedelta
import os
from pathlib import Path
import threading
from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
import re

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ---------------- FLASK APP ----------------
app = Flask(__name__)
# Enable CORS for all routes
CORS(app, origins=[
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://news-forge-gamma.vercel.app',
    'https://www.groksblog.com',
    'https://groks-blog.vercel.app'
])

@app.route("/")
def home():
    return {"status": "Comprehensive News Scraper is running 🚀"}

@app.route("/health")
def health():
    return {"status": "ok"}

@app.route("/debug")
def debug():
    """Debug endpoint to test scraping without saving"""
    cache = load_cache()
    
    results = {}
    
    # Test only working sources
    bikedekho = scrape_bikedekho()
    results['bikedekho'] = {'found': len(bikedekho), 'sample': bikedekho[:2] if bikedekho else []}
    
    rushlane_cars = scrape_rushlane('cars-news')
    results['rushlane_cars'] = {'found': len(rushlane_cars), 'sample': rushlane_cars[:2] if rushlane_cars else []}
    
    rushlane_bikes = scrape_rushlane('bikes-news')
    results['rushlane_bikes'] = {'found': len(rushlane_bikes), 'sample': rushlane_bikes[:2] if rushlane_bikes else []}
    
    rushlane_ev = scrape_rushlane('electric-vehicles')
    results['rushlane_ev'] = {'found': len(rushlane_ev), 'sample': rushlane_ev[:2] if rushlane_ev else []}
    
    ie = scrape_ie()
    results['indian_express'] = {'found': len(ie), 'sample': ie[:2] if ie else []}
    
    return {
        "cache_size": len(cache),
        "results": results
    }

@app.route("/reset-cache")
def reset_cache():
    """Endpoint to reset today's cache"""
    try:
        cache_file = get_cache_filename()
        if os.path.exists(cache_file):
            os.remove(cache_file)
            return {"status": "success", "message": f"Cache cleared: {cache_file}"}
        return {"status": "success", "message": "No cache file to clear"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.route("/scrape-now")
def scrape_now():
    """Endpoint to trigger immediate scraping"""
    try:
        thread = threading.Thread(target=sync_news)
        thread.start()
        return {"status": "success", "message": "Scraping started in background"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# ---------------- CONFIG ----------------
API_URL = os.getenv('API_URL', 'http://localhost:5000')
INGEST_ENDPOINT = f"{API_URL}/api/scraped_blogs/scraped/ingest"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Accept-Encoding": "gzip, deflate",
    "Connection": "keep-alive",
}

CHECK_INTERVAL = int(os.getenv('CHECK_INTERVAL', '900'))  # 15 minutes
MAX_ARTICLES_PER_SOURCE = int(os.getenv('MAX_ARTICLES_PER_SOURCE', '15'))
MAX_TOTAL_ARTICLES_PER_RUN = int(os.getenv('MAX_TOTAL_ARTICLES_PER_RUN', '100'))

CACHE_DIR = "cache"
CACHE_FILE_TEMPLATE = "sent_articles_{date}.json"

# ---------------- CACHE ----------------
def get_cache_filename():
    today = date.today().strftime("%Y-%m-%d")
    return os.path.join(CACHE_DIR, CACHE_FILE_TEMPLATE.format(date=today))

def ensure_cache_dir():
    if not os.path.exists(CACHE_DIR):
        os.makedirs(CACHE_DIR)
        logger.info(f"Created cache directory: {CACHE_DIR}")

def cleanup_old_caches():
    try:
        current_time = time.time()
        for cache_file in Path(CACHE_DIR).glob("sent_articles_*.json"):
            if current_time - cache_file.stat().st_mtime > 7 * 24 * 3600:
                cache_file.unlink()
                logger.info(f"Removed old cache: {cache_file}")
    except Exception as e:
        logger.error(f"Error cleaning cache: {e}")

def load_cache():
    ensure_cache_dir()
    cleanup_old_caches()
    file = get_cache_filename()
    if os.path.exists(file):
        try:
            with open(file, 'r') as f:
                data = json.load(f)
                sent_links = set(data.get('sent_links', []))
                logger.info(f"Loaded cache: {len(sent_links)} articles already sent today")
                return sent_links
        except Exception as e:
            logger.error(f"Error loading cache: {e}")
            return set()
    logger.info("No cache file found, starting fresh")
    return set()

def save_cache(cache):
    ensure_cache_dir()
    file = get_cache_filename()
    try:
        with open(file, 'w') as f:
            json.dump({
                "date": date.today().isoformat(),
                "sent_links": list(cache)
            }, f)
        logger.info(f"Saved cache: {len(cache)} articles")
    except Exception as e:
        logger.error(f"Error saving cache: {e}")

def is_article_sent(link, cache):
    return link in cache

def mark_as_sent(link, cache):
    cache.add(link)
    if len(cache) % 10 == 0:
        save_cache(cache)

# ---------------- CONTENT EXTRACTION ----------------
def extract_bikedekho_content(url):
    """Extract content from BikeDekho article"""
    try:
        response = requests.get(url, headers=HEADERS, timeout=15)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")
        
        content_div = soup.find('div', class_='newsMainContent')
        if not content_div:
            content_div = soup.find('article')
        
        if content_div:
            content_parts = []
            for elem in content_div.find_all(['p', 'h2', 'h3']):
                text = elem.get_text(strip=True)
                if len(text) > 30:
                    content_parts.append(text)
            if content_parts:
                return ' '.join(content_parts)[:1500]
        
        # Fallback: get all paragraphs
        for p in soup.find_all('p'):
            text = p.get_text(strip=True)
            if len(text) > 100:
                return text[:1000]
        return ""
    except Exception as e:
        logger.error(f"Error extracting BikeDekho content: {e}")
        return ""

def extract_rushlane_content(url):
    """Extract content from RushLane article"""
    try:
        response = requests.get(url, headers=HEADERS, timeout=15)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")
        
        content_div = soup.find('div', class_='tdb-block-inner')
        if not content_div:
            content_div = soup.find('article')
        
        if content_div:
            content_parts = []
            for elem in content_div.find_all(['p', 'h2', 'h3']):
                text = elem.get_text(strip=True)
                if len(text) > 30 and not text.startswith('Advertisement'):
                    content_parts.append(text)
            if content_parts:
                return ' '.join(content_parts)[:1500]
        return ""
    except Exception as e:
        logger.error(f"Error extracting RushLane content: {e}")
        return ""

def get_ie_content(url):
    """Extract content from Indian Express article"""
    try:
        response = requests.get(url, headers=HEADERS, timeout=15)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")
        
        # Try to get synopsis first
        synopsis = soup.find("h2", class_="synopsis")
        if synopsis:
            synopsis_text = synopsis.text.strip()
            if len(synopsis_text) > 50:
                return synopsis_text[:1000]
        
        # Try multiple selectors for content
        selectors = [
            "div.full-details p",
            "div.story_details p", 
            "article p",
            ".content p",
            "div[itemprop='articleBody'] p",
            ".ie-content p"
        ]
        
        content_parts = []
        for selector in selectors:
            elements = soup.select(selector)
            if elements:
                for elem in elements[:8]:  # Get first 8 paragraphs
                    text = elem.text.strip()
                    if len(text) > 50 and not text.startswith('Advertisement'):
                        content_parts.append(text)
                if content_parts:
                    break
        
        if content_parts:
            return ' '.join(content_parts)[:1500]
        
        # Ultimate fallback
        for p in soup.find_all('p'):
            text = p.text.strip()
            if len(text) > 100:
                return text[:1000]
        return ""
    except Exception as e:
        logger.error(f"Error extracting IE content from {url}: {e}")
        return ""

# ---------------- SCRAPERS ----------------
def scrape_bikedekho():
    """Scrape BikeDekho for news articles"""
    news = []
    url = "https://www.bikedekho.com/news"
    
    try:
        logger.info(f"Scraping BikeDekho: {url}")
        response = requests.get(url, headers=HEADERS, timeout=15)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")
        
        articles = soup.select('div.card_news')
        logger.info(f"Found {len(articles)} article cards")
        
        for article in articles[:MAX_ARTICLES_PER_SOURCE]:
            try:
                title_elem = article.select_one('div.title a')
                if not title_elem:
                    continue
                
                title = title_elem.get_text(strip=True)
                link = title_elem.get('href')
                
                if link and not link.startswith('http'):
                    link = f"https://www.bikedekho.com{link}"
                
                # Get description
                desc_elem = article.select_one('p')
                description = desc_elem.get_text(strip=True) if desc_elem else title
                
                # Extract full content for summary
                full_content = extract_bikedekho_content(link)
                if not full_content:
                    full_content = description
                
                news.append({
                    "source": "BikeDekho",
                    "title": title,
                    "link": link,
                    "summary": (full_content[:500] if full_content else description[:500]),
                    "time": datetime.now().strftime("%b %d, %Y")
                })
            except Exception as e:
                logger.error(f"Error parsing BikeDekho article: {e}")
                continue
        
        logger.info(f"BikeDekho scrape complete: {len(news)} articles")
    except Exception as e:
        logger.error(f"Error scraping BikeDekho: {e}")
    
    return news

def scrape_rushlane(category):
    """Scrape RushLane for news articles"""
    news = []
    url = f"https://www.rushlane.com/category/{category}"
    
    try:
        logger.info(f"Scraping RushLane - {category}: {url}")
        response = requests.get(url, headers=HEADERS, timeout=15)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")
        
        articles = soup.select('.tdb_module_loop')
        logger.info(f"Found {len(articles)} articles")
        
        for article in articles[:MAX_ARTICLES_PER_SOURCE]:
            try:
                title_elem = article.select_one('.entry-title a')
                if not title_elem:
                    continue
                
                title = title_elem.get_text(strip=True)
                link = title_elem.get('href')
                
                # Get excerpt
                excerpt_elem = article.select_one('.td-excerpt')
                excerpt = excerpt_elem.get_text(strip=True) if excerpt_elem else title
                
                # Extract full content for summary
                full_content = extract_rushlane_content(link)
                if not full_content:
                    full_content = excerpt
                
                category_name = category.replace('-', ' ').title()
                
                news.append({
                    "source": f"RushLane - {category_name}",
                    "title": title,
                    "link": link,
                    "summary": (full_content[:500] if full_content else excerpt[:500]),
                    "time": datetime.now().strftime("%b %d, %Y")
                })
            except Exception as e:
                logger.error(f"Error parsing RushLane article: {e}")
                continue
        
        logger.info(f"RushLane {category} scrape complete: {len(news)} articles")
    except Exception as e:
        logger.error(f"Error scraping RushLane {category}: {e}")
    
    return news

def scrape_ie():
    """Scrape Indian Express for articles"""
    news = []
    url = "https://indianexpress.com/section/india/"
    
    try:
        logger.info(f"Scraping IE: {url}")
        response = requests.get(url, headers=HEADERS, timeout=15)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")
        
        # Look for articles
        articles = soup.select('article, .articles, li.article, .story-card')
        logger.info(f"Found {len(articles)} potential articles")
        
        for art in articles[:MAX_ARTICLES_PER_SOURCE]:
            try:
                a = art.find('a')
                if not a:
                    continue
                
                link = a.get('href')
                if not link:
                    continue
                
                title = a.get('title') or a.get('aria-label')
                if not title:
                    title = a.text.strip()
                
                if not title:
                    h2 = art.find('h2')
                    h3 = art.find('h3')
                    title = h2.text.strip() if h2 else (h3.text.strip() if h3 else "")
                
                if not title or len(title) < 20:
                    continue
                
                if link and not link.startswith('http'):
                    link = "https://indianexpress.com" + link
                
                # Get summary
                summary_elem = art.select_one('p')
                summary = summary_elem.text.strip() if summary_elem else title
                
                # Extract full content for better summary
                full_content = get_ie_content(link)
                if not full_content:
                    full_content = summary
                
                news.append({
                    "source": "Indian Express",
                    "title": title,
                    "link": link,
                    "summary": (full_content[:500] if full_content else summary[:500]),
                    "time": datetime.now().strftime("%b %d, %Y")
                })
            except Exception as e:
                logger.error(f"Error parsing IE article: {e}")
                continue
        
        logger.info(f"IE scrape complete: {len(news)} articles")
    except Exception as e:
        logger.error(f"Error scraping IE: {e}")
    
    return news

# ---------------- SEND TO BACKEND ----------------
def send_to_backend(articles, cache):
    """Send articles to backend API with proper data format"""
    sent_count = 0
    for article in articles:
        if is_article_sent(article["link"], cache):
            continue
        
        try:
            # Prepare article data with all required fields
            article_data = {
                "source": article["source"][:100],  # Limit length
                "title": article["title"][:500],    # Limit length
                "link": article["link"],
                "summary": article.get("summary", article["title"])[:1000],
                "time": article.get("time", datetime.now().strftime("%b %d, %Y")),
                "image": article.get("image", ""),
                "author": article.get("author", "News Desk")
            }
            
            logger.info(f"Sending: {article['title'][:50]}...")
            response = requests.post(INGEST_ENDPOINT, json=article_data, timeout=10)
            
            if response.status_code in [200, 201]:
                mark_as_sent(article["link"], cache)
                sent_count += 1
                logger.info(f"✅ Sent successfully: {article['title'][:50]}")
            else:
                logger.error(f"❌ Failed: {response.status_code} - {response.text[:200]}")
            
            time.sleep(0.5)  # Rate limiting
        except Exception as e:
            logger.error(f"Error sending article: {e}")
    
    save_cache(cache)
    return sent_count

# ---------------- SYNC FUNCTION ----------------
def sync_news():
    """Main sync function to scrape all sources"""
    logger.info(f"[{datetime.now()}] Starting comprehensive sync...")
    
    cache = load_cache()
    all_articles = []
    
    logger.info("=" * 60)
    logger.info("SCRAPING ALL SOURCES")
    logger.info("=" * 60)
    
    # Scrape only working sources
    all_articles.extend(scrape_bikedekho())
    all_articles.extend(scrape_rushlane('cars-news'))
    all_articles.extend(scrape_rushlane('bikes-news'))
    all_articles.extend(scrape_rushlane('electric-vehicles'))
    all_articles.extend(scrape_ie())
    
    # Remove duplicates by link
    unique_articles = {}
    for article in all_articles:
        if article["link"] not in unique_articles:
            unique_articles[article["link"]] = article
    
    all_articles = list(unique_articles.values())
    
    # Filter new articles
    new_articles = [a for a in all_articles if not is_article_sent(a["link"], cache)]
    new_articles = new_articles[:MAX_TOTAL_ARTICLES_PER_RUN]
    
    logger.info(f"📊 TOTAL: {len(all_articles)} unique, {len(new_articles)} new")
    
    if new_articles:
        sent_count = send_to_backend(new_articles, cache)
        logger.info(f"✅ Sent {sent_count} articles")
    else:
        logger.info("📭 No new articles")
    
    logger.info(f"Cache size: {len(cache)}")

# ---------------- BACKGROUND THREAD ----------------
def run_scraper():
    """Background thread that runs the scraper periodically"""
    logger.info("🚀 Background comprehensive scraper started")
    sync_news()
    
    while True:
        try:
            next_run = datetime.now() + timedelta(seconds=CHECK_INTERVAL)
            logger.info(f"💤 Next run at {next_run.strftime('%Y-%m-%d %H:%M:%S')}")
            time.sleep(CHECK_INTERVAL)
            sync_news()
        except Exception as e:
            logger.error(f"Error in scraper loop: {e}")
            time.sleep(60)

def start_background():
    time.sleep(2)
    t = threading.Thread(target=run_scraper)
    t.daemon = True
    t.start()

start_background()

# ---------------- LOCAL RUN ----------------
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    logger.info(f"Starting Flask app on port {port}")
    app.run(host="0.0.0.0", port=port, debug=False)