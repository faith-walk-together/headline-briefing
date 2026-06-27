import os
import json
import time
from time import mktime
import feedparser
from datetime import datetime
import pytz
from google import genai

# Curated High-Quality RSS Feeds with specific limits and detailed targeting
RSS_FEEDS = [
    # 정치
    {"category": "정치", "outlet": "JTBC", "url": "https://fs.jtbc.co.kr/RSS/politics.xml", "limit": 3},
    {"category": "정치", "outlet": "NYT", "url": "https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml", "limit": 3},
    {"category": "정치", "outlet": "KBS", "url": "https://news.kbs.co.kr/rss/xml/politics.xml", "limit": 2},
    {"category": "정치", "outlet": "조선일보", "url": "https://www.chosun.com/arc/outboundfeeds/rss/category/politics/?outputType=xml", "limit": 2},
    {"category": "정치", "outlet": "BBC", "url": "http://feeds.bbci.co.uk/news/politics/rss.xml", "limit": 2},
    
    # 경제
    {"category": "경제", "outlet": "NYT", "url": "https://rss.nytimes.com/services/xml/rss/nyt/Business.xml", "limit": 3},
    {"category": "경제", "outlet": "JTBC", "url": "https://fs.jtbc.co.kr/RSS/economy.xml", "limit": 2},
    {"category": "경제", "outlet": "한국경제", "url": "https://rss.hankyung.com/feed/economy.xml", "limit": 2},
    {"category": "경제", "outlet": "매일경제", "url": "https://www.mk.co.kr/rss/30000016/", "limit": 2},
    {"category": "경제", "outlet": "BBC", "url": "http://feeds.bbci.co.uk/news/business/rss.xml", "limit": 2},
    
    # IT/과학
    {"category": "IT/과학", "outlet": "JTBC", "url": "https://fs.jtbc.co.kr/RSS/newsflash.xml", "limit": 2},
    {"category": "IT/과학", "outlet": "NYT", "url": "https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml", "limit": 2},
    {"category": "IT/과학", "outlet": "ZDNet Korea", "url": "https://feeds.feedburner.com/zdkorea", "limit": 2},
    {"category": "IT/과학", "outlet": "전자신문", "url": "https://rss.etnews.com/Section901.xml", "limit": 2},
    {"category": "IT/과학", "outlet": "BBC", "url": "http://feeds.bbci.co.uk/news/technology/rss.xml", "limit": 2},
    
    # 세계
    {"category": "세계", "outlet": "NYT", "url": "https://rss.nytimes.com/services/xml/rss/nyt/World.xml", "limit": 5},
    {"category": "세계", "outlet": "BBC", "url": "http://feeds.bbci.co.uk/news/world/rss.xml", "limit": 5}
]

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# 필터링할 무의미한 단어들 (날씨 제외)
SKIP_KEYWORDS = ["다시보기", "클로징", "예고", "풀영상", "인사", "부고", "부음", "오대영 라이브"]

def summarize_and_translate_text(title, max_retries=3):
    if not GEMINI_API_KEY:
        return {
            "translated_title": title,
            "summary": "Gemini API 키가 설정되지 않아 임시 요약을 제공합니다. (Github Secrets에 GEMINI_API_KEY를 등록해주세요.)"
        }
    
    client = genai.Client(api_key=GEMINI_API_KEY)
    
    response_schema = {
        "type": "OBJECT",
        "properties": {
            "translated_title": {
                "type": "STRING",
                "description": "The headline accurately and naturally translated into KOREAN 100%. Under no circumstances should this be left in English."
            },
            "summary": {
                "type": "STRING",
                "description": "A concise 3-line summary of the news in KOREAN."
            }
        },
        "required": ["translated_title", "summary"]
    }
    
    prompt = f"다음 뉴스 헤드라인을 바탕으로 주요 내용을 반드시 '100% 한국어'로 번역하고 3줄 이내로 간결하게 요약해줘. 영어가 절대 섞이면 안 돼. 제목(translated_title)도 무조건 한국어로 번역해:\n\n{title}"
    
    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config={
                    "response_mime_type": "application/json",
                    "response_schema": response_schema,
                }
            )
            
            result = json.loads(response.text)
            return {
                "translated_title": result.get("translated_title", title),
                "summary": result.get("summary", "요약을 불러오는 데 실패했습니다.")
            }
        except Exception as e:
            print(f"Attempt {attempt + 1} failed for '{title}': {e}")
            if attempt < max_retries - 1:
                # Exponential backoff: 10s -> 20s
                sleep_time = 10 * (attempt + 1)
                print(f"Sleeping for {sleep_time} seconds before retrying...")
                time.sleep(sleep_time)
            else:
                return {
                    "translated_title": title,
                    "summary": "요약을 불러오는 데 실패했습니다."
                }

def fetch_feed_data():
    all_news = []
    
    for feed in RSS_FEEDS:
        print(f"Fetching {feed['category']} news from {feed['outlet']}...")
        parsed = feedparser.parse(feed["url"])
        
        count = 0
        for entry in parsed.entries:
            if count >= feed["limit"]:
                break
                
            title = entry.title
            
            # 1. 쓸모없는 기사 필터링
            if any(keyword in title for keyword in SKIP_KEYWORDS):
                print(f"Skipping article due to keyword filter: {title}")
                continue
                
            link = entry.link
            
            # 3. Invalid Date 수정: 국제 표준 포맷(ISO-8601)으로 일괄 변환
            iso_date = datetime.now(pytz.utc).isoformat()
            if hasattr(entry, 'published_parsed') and entry.published_parsed:
                dt = datetime.fromtimestamp(mktime(entry.published_parsed), pytz.utc)
                iso_date = dt.isoformat()
            elif hasattr(entry, 'updated_parsed') and entry.updated_parsed:
                dt = datetime.fromtimestamp(mktime(entry.updated_parsed), pytz.utc)
                iso_date = dt.isoformat()
            
            # Rate limiting mitigation for Gemini API (free tier)
            # Increased from 4.5s to 6.0s to stay comfortably below 15 RPM
            time.sleep(6.0)
            
            ai_result = summarize_and_translate_text(title)
            
            all_news.append({
                "category": feed["category"],
                "outlet": feed["outlet"],
                "title": ai_result["translated_title"],
                "link": link,
                "summary": ai_result["summary"],
                "pub_date": iso_date
            })
            
            count += 1
            
    return all_news

if __name__ == "__main__":
    news_data = fetch_feed_data()
    
    output = {
        "last_updated": datetime.now(pytz.utc).isoformat(),
        "articles": news_data
    }
    
    os.makedirs("public_data", exist_ok=True)
    with open("public_data/latest_news.json", "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    
    print("latest_news.json generated successfully.")
