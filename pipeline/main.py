import os
import json
import time
import feedparser
from datetime import datetime
import pytz
from google import genai

# Google News RSS Feeds (Aggregates major Korean outlets like KBS, SBS, Chosun, etc.)
RSS_FEEDS = [
    {"category": "정치", "url": "https://news.google.com/rss/headlines/section/topic/POLITICS?hl=ko&gl=KR&ceid=KR:ko"},
    {"category": "경제", "url": "https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=ko&gl=KR&ceid=KR:ko"},
    {"category": "IT/과학", "url": "https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=ko&gl=KR&ceid=KR:ko"},
    {"category": "세계", "url": "https://news.google.com/rss/headlines/section/topic/WORLD?hl=ko&gl=KR&ceid=KR:ko"}
]

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

def summarize_and_translate_text(title, max_retries=2):
    if not GEMINI_API_KEY:
        return {
            "translated_title": title,
            "summary": "Gemini API 키가 설정되지 않아 임시 요약을 제공합니다. (Github Secrets에 GEMINI_API_KEY를 등록해주세요.)"
        }
    
    client = genai.Client(api_key=GEMINI_API_KEY)
    
    # JSON schema definition for structured output
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
        
        # Parse the JSON response
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
        print(f"Fetching {feed['category']} news from Google News...")
        parsed = feedparser.parse(feed["url"])
        
        # Google News aggregates articles, so we can fetch more to get a good mix.
        # Fetching top 5 per category (total 20 articles)
        for entry in parsed.entries[:5]:
            title = entry.title
            link = entry.link
            pub_date = entry.get("published", entry.get("updated", ""))
            
            # Google News usually provides the original publisher in the source tag.
            outlet = "Google News"
            if hasattr(entry, 'source') and hasattr(entry.source, 'title'):
                outlet = entry.source.title
            
            # Rate limiting mitigation for Gemini API (free tier)
            time.sleep(2)
            
            ai_result = summarize_and_translate_text(title)
            
            all_news.append({
                "category": feed["category"],
                "outlet": outlet,
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
