import os
import json
import feedparser
from datetime import datetime
import pytz
from openai import OpenAI

# RSS Feeds List (Defaults)
RSS_FEEDS = [
    {"category": "정치", "outlet": "연합뉴스", "url": "https://www.yonhapnewstv.co.kr/category/news/politics/feed/"},
    {"category": "경제", "outlet": "매일경제", "url": "https://www.mk.co.kr/rss/30000001/"},
    {"category": "IT/과학", "outlet": "전자신문", "url": "https://rss.etnews.com/Section901.xml"},
    {"category": "세계", "outlet": "BBC", "url": "http://feeds.bbci.co.uk/news/world/rss.xml"}
]

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

def summarize_text(title, max_retries=2):
    if not OPENAI_API_KEY:
        return "OpenAI API 키가 설정되지 않아 임시 요약을 제공합니다. (Github Secrets에 OPENAI_API_KEY를 등록해주세요.)"
    
    client = OpenAI(api_key=OPENAI_API_KEY)
    prompt = f"다음 뉴스 헤드라인을 바탕으로 주요 내용을 한국어로 3줄 이내로 간결하게 요약해줘(해외 뉴스라면 번역해줘):\n\n{title}"
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=200,
            temperature=0.5
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Error summarizing {title}: {e}")
        return "요약을 불러오는 데 실패했습니다."

def fetch_feed_data():
    all_news = []
    
    for feed in RSS_FEEDS:
        print(f"Fetching {feed['outlet']} - {feed['category']}...")
        parsed = feedparser.parse(feed["url"])
        
        # Take top 3 entries per feed to save time/API cost for MVP
        for entry in parsed.entries[:3]:
            title = entry.title
            link = entry.link
            pub_date = entry.get("published", entry.get("updated", ""))
            
            summary = summarize_text(title)
            
            all_news.append({
                "category": feed["category"],
                "outlet": feed["outlet"],
                "title": title,
                "link": link,
                "summary": summary,
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
