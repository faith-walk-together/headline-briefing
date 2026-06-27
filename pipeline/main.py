import os
import json
import time
import feedparser
from datetime import datetime
import pytz
from google import genai

# Curated High-Quality RSS Feeds with specific limits and detailed targeting
RSS_FEEDS = [
    # 정치
    {"category": "정치", "outlet": "JTBC", "url": "https://fs.jtbc.co.kr/RSS/politics.xml", "limit": 3},
    {"category": "정치", "outlet": "CNN", "url": "http://rss.cnn.com/rss/cnn_allpolitics.rss", "limit": 3},
    {"category": "정치", "outlet": "KBS", "url": "https://news.kbs.co.kr/rss/xml/politics.xml", "limit": 2},
    {"category": "정치", "outlet": "조선일보", "url": "https://www.chosun.com/arc/outboundfeeds/rss/category/politics/?outputType=xml", "limit": 2},
    {"category": "정치", "outlet": "BBC", "url": "http://feeds.bbci.co.uk/news/politics/rss.xml", "limit": 2},
    
    # 경제
    {"category": "경제", "outlet": "CNN", "url": "http://rss.cnn.com/rss/money_latest.rss", "limit": 3},
    {"category": "경제", "outlet": "JTBC", "url": "https://fs.jtbc.co.kr/RSS/economy.xml", "limit": 2},
    {"category": "경제", "outlet": "한국경제", "url": "https://rss.hankyung.com/feed/economy.xml", "limit": 2},
    {"category": "경제", "outlet": "매일경제", "url": "https://www.mk.co.kr/rss/30000001/", "limit": 2},
    {"category": "경제", "outlet": "BBC", "url": "http://feeds.bbci.co.uk/news/business/rss.xml", "limit": 2},
    
    # IT/과학
    {"category": "IT/과학", "outlet": "JTBC", "url": "https://fs.jtbc.co.kr/RSS/newsflash.xml", "limit": 2},
    {"category": "IT/과학", "outlet": "CNN", "url": "http://rss.cnn.com/rss/edition_technology.rss", "limit": 2},
    {"category": "IT/과학", "outlet": "ZDNet Korea", "url": "https://feeds.feedburner.com/zdkorea", "limit": 2},
    {"category": "IT/과학", "outlet": "전자신문", "url": "https://rss.etnews.com/Section901.xml", "limit": 2},
    {"category": "IT/과학", "outlet": "BBC", "url": "http://feeds.bbci.co.uk/news/technology/rss.xml", "limit": 2},
    
    # 세계
    {"category": "세계", "outlet": "CNN", "url": "http://rss.cnn.com/rss/edition_world.rss", "limit": 5},
    {"category": "세계", "outlet": "BBC", "url": "http://feeds.bbci.co.uk/news/world/rss.xml", "limit": 5}
]

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

def summarize_and_translate_text(title, max_retries=2):
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
                "description": "The title translated to Korean. If it's already in Korean, keep it as is."
            },
            "summary": {
                "type": "STRING",
                "description": "A concise 3-line summary of the news in Korean."
            }
        },
        "required": ["translated_title", "summary"]
    }
    
    prompt = f"다음 뉴스 헤드라인을 바탕으로 주요 내용을 한국어로 3줄 이내로 간결하게 요약해줘(해외 뉴스라면 제목과 내용을 모두 한국어로 번역해줘):\n\n{title}"
    
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
        print(f"Error summarizing {title}: {e}")
        return {
            "translated_title": title,
            "summary": "요약을 불러오는 데 실패했습니다."
        }

def fetch_feed_data():
    all_news = []
    
    for feed in RSS_FEEDS:
        print(f"Fetching {feed['category']} news from {feed['outlet']}...")
        parsed = feedparser.parse(feed["url"])
        
        # 지정된 limit 개수만큼만 가져오기
        for entry in parsed.entries[:feed["limit"]]:
            title = entry.title
            link = entry.link
            pub_date = entry.get("published", entry.get("updated", ""))
            
            # Rate limiting mitigation for Gemini API (free tier 15 RPM = 1 req / 4 sec)
            time.sleep(4.5)
            
            ai_result = summarize_and_translate_text(title)
            
            all_news.append({
                "category": feed["category"],
                "outlet": feed["outlet"],
                "title": ai_result["translated_title"],
                "link": link,
                "summary": ai_result["summary"],
                "pub_date": pub_date
            })
            
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
