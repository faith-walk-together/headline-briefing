import os
import json
import time
from time import mktime
import feedparser
from datetime import datetime
import pytz
from google import genai
from pydantic import BaseModel, Field

# Curated High-Quality RSS Feeds with specific limits and detailed targeting (Total: 50)
RSS_FEEDS = [
    # 정치 (15)
    {"category": "정치", "outlet": "SBS", "url": "https://news.sbs.co.kr/news/SectionRssFeed.do?sectionId=01&plink=RSSREADER", "limit": 2},
    {"category": "정치", "outlet": "MBC", "url": "https://imnews.imbc.com/rss/news/news_00.xml", "limit": 2},
    {"category": "정치", "outlet": "KBS", "url": "https://news.kbs.co.kr/rss/xml/politics.xml", "limit": 2},
    {"category": "정치", "outlet": "NYT", "url": "https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml", "limit": 3},
    {"category": "정치", "outlet": "연합뉴스", "url": "https://www.yonhapnewstv.co.kr/category/news/politics/feed/", "limit": 2},
    {"category": "정치", "outlet": "BBC", "url": "http://feeds.bbci.co.uk/news/politics/rss.xml", "limit": 2},
    {"category": "정치", "outlet": "조선일보", "url": "https://www.chosun.com/arc/outboundfeeds/rss/category/politics/?outputType=xml", "limit": 1},
    {"category": "정치", "outlet": "중앙일보", "url": "https://rss.joins.com/joins_politics_list.xml", "limit": 1},

    # 경제 (13)
    {"category": "경제", "outlet": "SBS Biz", "url": "https://biz.sbs.co.kr/rss", "limit": 2},
    {"category": "경제", "outlet": "NYT", "url": "https://rss.nytimes.com/services/xml/rss/nyt/Business.xml", "limit": 3},
    {"category": "경제", "outlet": "한국경제", "url": "https://rss.hankyung.com/feed/economy.xml", "limit": 2},
    {"category": "경제", "outlet": "매일경제", "url": "https://www.mk.co.kr/rss/30000016/", "limit": 2},
    {"category": "경제", "outlet": "BBC", "url": "http://feeds.bbci.co.uk/news/business/rss.xml", "limit": 2},
    {"category": "경제", "outlet": "조선비즈", "url": "https://biz.chosun.com/arc/outboundfeeds/rss/category/economy/?outputType=xml", "limit": 1},
    {"category": "경제", "outlet": "서울경제", "url": "https://www.sedaily.com/RSS/Finance", "limit": 1},

    # IT/과학 (12)
    {"category": "IT/과학", "outlet": "ZDNet Korea", "url": "https://feeds.feedburner.com/zdkorea", "limit": 2},
    {"category": "IT/과학", "outlet": "전자신문", "url": "https://rss.etnews.com/Section901.xml", "limit": 2},
    {"category": "IT/과학", "outlet": "블로터", "url": "https://www.bloter.net/rss/allArticle.xml", "limit": 2},
    {"category": "IT/과학", "outlet": "조선비즈 IT/Tech", "url": "https://biz.chosun.com/arc/outboundfeeds/rss/category/it-science/?outputType=xml", "limit": 2},
    {"category": "IT/과학", "outlet": "NYT", "url": "https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml", "limit": 2},
    {"category": "IT/과학", "outlet": "BBC", "url": "http://feeds.bbci.co.uk/news/technology/rss.xml", "limit": 2},

    # 세계 (10)
    {"category": "세계", "outlet": "NYT", "url": "https://rss.nytimes.com/services/xml/rss/nyt/World.xml", "limit": 5},
    {"category": "세계", "outlet": "BBC", "url": "http://feeds.bbci.co.uk/news/world/rss.xml", "limit": 5}
]

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# 필터링할 무의미한 단어들 (날씨 제외)
SKIP_KEYWORDS = ["다시보기", "클로징", "예고", "풀영상", "인사", "부고", "부음", "오대영 라이브", "날씨", "스포츠"]

class CuratedArticle(BaseModel):
    id: int = Field(description="선택된 기사의 원본 ID 번호")
    translated_title: str = Field(description="반드시 영어 원문을 100% 한국어로 번역/다듬은 완벽한 문장의 제목 (영단어 노출 금지)")
    summary: str = Field(description="기사 내용을 바탕으로 유추한 한국어 3줄 요약 (가장 중요한 팩트 위주)")

class FeedCuratorResponse(BaseModel):
    top_articles: list[CuratedArticle] = Field(description="엄선된 주요 뉴스 리스트")

def parse_iso_date(entry):
    iso_date = ""
    if hasattr(entry, 'published_parsed') and entry.published_parsed:
        dt = datetime.fromtimestamp(mktime(entry.published_parsed), pytz.utc)
        iso_date = dt.isoformat()
    elif hasattr(entry, 'updated_parsed') and entry.updated_parsed:
        dt = datetime.fromtimestamp(mktime(entry.updated_parsed), pytz.utc)
        iso_date = dt.isoformat()
    else:
        iso_date = datetime.now(pytz.utc).isoformat()
    return iso_date

def fetch_feed_data():
    all_news = []
    
    # 만약 API 키가 없으면 에러 방지
    client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None
    
    for feed in RSS_FEEDS:
        print(f"Fetching {feed['category']} news from {feed['outlet']}...")
        parsed = feedparser.parse(feed["url"])
        
        # 1. 1차 필터링: 무의미한 기사를 제외한 상위 30개의 기사 후보군 추출
        candidate_entries = []
        for entry in parsed.entries:
            if any(keyword in entry.title for keyword in SKIP_KEYWORDS):
                continue
            candidate_entries.append(entry)
            if len(candidate_entries) >= 30:
                break
                
        if not candidate_entries:
            print(f"No valid articles found in {feed['outlet']}.")
            continue
            
        # 2. AI 편집장(Curator)에게 보낼 프롬프트 구성
        target_count = min(feed["limit"], len(candidate_entries))
        prompt_text = f"당신은 {feed['outlet']} 언론사의 편집장입니다. 다음은 최근 송고된 {len(candidate_entries)}개의 기사 제목입니다.\n\n"
        for idx, entry in enumerate(candidate_entries):
            prompt_text += f"ID: {idx} | Title: {entry.title}\n"
        
        prompt_text += f"\n위 기사들 중에서, 오늘 하루 국가적/세계적으로 가장 비중 있고 중요한 '메인 헤드라인(Headline)' 뉴스 딱 {target_count}개만 엄선하십시오.\n"
        prompt_text += "선택된 기사의 원래 ID 번호, 100% 한국어로 번역된 제목(외국어 금지), 그리고 3줄 요약을 반환하십시오."
        
        ai_success = False
        
        # API 호출이 불가능하거나 키가 없는 경우 대비
        if client:
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    # 속도 제한(Rate Limit)을 우회하기 위한 지연 (언론사당 1번 호출이므로 10초로 충분)
                    time.sleep(10.0)
                    
                    response = client.models.generate_content(
                        model="gemini-2.5-flash",
                        contents=prompt_text,
                        config={
                            "response_mime_type": "application/json",
                            "response_schema": FeedCuratorResponse,
                        }
                    )
                    
                    result_data = json.loads(response.text)
                    top_articles = result_data.get("top_articles", [])
                    
                    for item in top_articles:
                        idx = item.get("id")
                        if idx is not None and 0 <= idx < len(candidate_entries):
                            chosen_entry = candidate_entries[idx]
                            all_news.append({
                                "category": feed["category"],
                                "outlet": feed["outlet"],
                                "title": item.get("translated_title", chosen_entry.title),
                                "link": chosen_entry.link,
                                "summary": item.get("summary", "요약을 불러오는 데 실패했습니다."),
                                "pub_date": parse_iso_date(chosen_entry)
                            })
                    ai_success = True
                    break # 성공 시 재시도 루프 탈출
                except Exception as e:
                    print(f"Attempt {attempt + 1} failed for {feed['outlet']}: {e}")
                    if attempt < max_retries - 1:
                        time.sleep(10 * (attempt + 1))
        
        # 3. AI 큐레이션 실패 시(또는 API 키가 없는 경우) 단순 최신순 Fallback 처리
        if not ai_success:
            print(f"Fallback to simple parsing for {feed['outlet']}")
            for entry in candidate_entries[:target_count]:
                all_news.append({
                    "category": feed["category"],
                    "outlet": feed["outlet"],
                    "title": entry.title,
                    "link": entry.link,
                    "summary": "AI 요약을 불러오는 데 실패했습니다.",
                    "pub_date": parse_iso_date(entry)
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
    
    print(f"latest_news.json generated successfully with {len(news_data)} curated articles.")
