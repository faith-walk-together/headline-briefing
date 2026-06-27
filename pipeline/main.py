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
                "description": "반드시 영어 원문을 100% 한국어로 번역한 제목이어야 합니다. 영어가 섞이면 안 됩니다."
            },
            "summary": {
                "type": "STRING",
                "description": "기사 내용을 한국어로 3줄 이내로 간결하게 요약한 텍스트."
            }
        },
        "required": ["translated_title", "summary"]
    }
    
    prompt = f"다음 뉴스 헤드라인을 바탕으로 주요 내용을 무조건 '100% 한국어'로 번역하고 3줄 이내로 간결하게 요약해. 단 하나의 영단어도 그대로 출력하지 말고 외국 고유명사도 모두 한글로 표기해. 제목(translated_title)도 완벽한 한국어 문장으로 번역해:\n\n{title}"
    
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
            pub = entry.get("published", entry.get("updated", ""))
            
            # 3. Invalid Date 수정 및 JTBC(YYYY.MM.DD) 커스텀 파싱
            iso_date = ""
            
            # JTBC 예외 처리 (예: "2024.10.29")
            if pub and "." in pub and len(pub.split(".")) >= 3:
                try:
                    date_str = pub.split(" ")[0] # 혹시 모를 공백 이후 시간 제거
                    dt = datetime.strptime(date_str, "%Y.%m.%d")
                    dt = pytz.timezone('Asia/Seoul').localize(dt)
                    iso_date = dt.astimezone(pytz.utc).isoformat()
                except Exception:
                    pass
            
            # 일반적인 파싱 (JTBC 예외 처리에 실패했거나 다른 언론사인 경우)
            if not iso_date:
                if hasattr(entry, 'published_parsed') and entry.published_parsed:
                    dt = datetime.fromtimestamp(mktime(entry.published_parsed), pytz.utc)
                    iso_date = dt.isoformat()
                elif hasattr(entry, 'updated_parsed') and entry.updated_parsed:
                    dt = datetime.fromtimestamp(mktime(entry.updated_parsed), pytz.utc)
                    iso_date = dt.isoformat()
                else:
                    iso_date = datetime.now(pytz.utc).isoformat()
            
            # Rate limiting mitigation for Gemini API
            # 호출 간격을 6초에서 12초(분당 5회)로 대폭 상향하여 API 차단 원천 봉쇄
            time.sleep(12.0)
            
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
