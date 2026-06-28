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
    # 정치 (15 -> 21)
    {"category": "정치", "outlet": "SBS", "url": "https://news.sbs.co.kr/news/SectionRssFeed.do?sectionId=01&plink=RSSREADER", "limit": 2},
    {"category": "정치", "outlet": "MBC", "url": "https://imnews.imbc.com/rss/news/news_00.xml", "limit": 2},
    {"category": "정치", "outlet": "KBS", "url": "https://news.kbs.co.kr/rss/xml/politics.xml", "limit": 2},
    {"category": "정치", "outlet": "NYT", "url": "https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml", "limit": 3},
    {"category": "정치", "outlet": "연합뉴스", "url": "https://www.yonhapnewstv.co.kr/category/news/politics/feed/", "limit": 2},
    {"category": "정치", "outlet": "BBC", "url": "http://feeds.bbci.co.uk/news/politics/rss.xml", "limit": 2},
    {"category": "정치", "outlet": "조선일보", "url": "https://www.chosun.com/arc/outboundfeeds/rss/category/politics/?outputType=xml", "limit": 1},
    {"category": "정치", "outlet": "중앙일보", "url": "https://rss.joins.com/joins_politics_list.xml", "limit": 1},
    {"category": "정치", "outlet": "JTBC", "url": "https://news.google.com/rss/search?q=%EC%A0%95%EC%B9%98+source:%22JTBC%22+when:1d&hl=ko&gl=KR&ceid=KR:ko", "limit": 3},
    {"category": "정치", "outlet": "CNN", "url": "https://news.google.com/rss/search?q=politics+source:%22CNN%22+when:1d&hl=en-US&gl=US&ceid=US:en", "limit": 3},

    # 경제 (13 -> 19)
    {"category": "경제", "outlet": "SBS Biz", "url": "https://biz.sbs.co.kr/rss", "limit": 2},
    {"category": "경제", "outlet": "NYT", "url": "https://rss.nytimes.com/services/xml/rss/nyt/Business.xml", "limit": 3},
    {"category": "경제", "outlet": "한국경제", "url": "https://rss.hankyung.com/feed/economy.xml", "limit": 2},
    {"category": "경제", "outlet": "매일경제", "url": "https://www.mk.co.kr/rss/30000016/", "limit": 2},
    {"category": "경제", "outlet": "BBC", "url": "http://feeds.bbci.co.uk/news/business/rss.xml", "limit": 2},
    {"category": "경제", "outlet": "조선비즈", "url": "https://biz.chosun.com/arc/outboundfeeds/rss/category/economy/?outputType=xml", "limit": 1},
    {"category": "경제", "outlet": "서울경제", "url": "https://www.sedaily.com/RSS/Finance", "limit": 1},
    {"category": "경제", "outlet": "JTBC", "url": "https://news.google.com/rss/search?q=%EA%B2%BD%EC%A0%9C+source:%22JTBC%22+when:1d&hl=ko&gl=KR&ceid=KR:ko", "limit": 3},
    {"category": "경제", "outlet": "CNN", "url": "https://news.google.com/rss/search?q=business+economy+source:%22CNN%22+when:1d&hl=en-US&gl=US&ceid=US:en", "limit": 3},

    # IT/과학 (12 -> 18)
    {"category": "IT/과학", "outlet": "ZDNet Korea", "url": "https://feeds.feedburner.com/zdkorea", "limit": 2},
    {"category": "IT/과학", "outlet": "전자신문", "url": "https://rss.etnews.com/Section901.xml", "limit": 2},
    {"category": "IT/과학", "outlet": "블로터", "url": "https://www.bloter.net/rss/allArticle.xml", "limit": 2},
    {"category": "IT/과학", "outlet": "조선비즈 IT/Tech", "url": "https://biz.chosun.com/arc/outboundfeeds/rss/category/it-science/?outputType=xml", "limit": 2},
    {"category": "IT/과학", "outlet": "NYT", "url": "https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml", "limit": 2},
    {"category": "IT/과학", "outlet": "BBC", "url": "http://feeds.bbci.co.uk/news/technology/rss.xml", "limit": 2},
    {"category": "IT/과학", "outlet": "JTBC", "url": "https://news.google.com/rss/search?q=IT+%EA%B3%BC%ED%95%99+source:%22JTBC%22+when:1d&hl=ko&gl=KR&ceid=KR:ko", "limit": 3},
    {"category": "IT/과학", "outlet": "CNN", "url": "https://news.google.com/rss/search?q=technology+science+source:%22CNN%22+when:1d&hl=en-US&gl=US&ceid=US:en", "limit": 3},

    # 세계 (10 -> 15)
    {"category": "세계", "outlet": "NYT", "url": "https://rss.nytimes.com/services/xml/rss/nyt/World.xml", "limit": 5},
    {"category": "세계", "outlet": "BBC", "url": "http://feeds.bbci.co.uk/news/world/rss.xml", "limit": 5},
    {"category": "세계", "outlet": "CNN", "url": "https://news.google.com/rss/search?q=world+source:%22CNN%22+when:1d&hl=en-US&gl=US&ceid=US:en", "limit": 5}
]

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# 필터링할 무의미한 단어들 (날씨 제외)
SKIP_KEYWORDS = ["다시보기", "클로징", "예고", "풀영상", "인사", "부고", "부음", "오대영 라이브", "날씨", "스포츠"]

class CuratedArticle(BaseModel):
    feed_index: int = Field(description="선택된 기사가 속한 언론사(Feed)의 고유 인덱스 번호")
    article_id: int = Field(description="선택된 기사의 원본 ID 번호")
    translated_title: str = Field(description="반드시 영어 원문을 100% 한국어로 번역/다듬은 완벽한 문장의 제목 (영단어 노출 금지)")
    summary: str = Field(description="기사 내용을 바탕으로 유추한 한국어 3줄 요약 (가장 중요한 팩트 위주)")

class GrandCurationResponse(BaseModel):
    all_curated_articles: list[CuratedArticle] = Field(description="모든 언론사에서 엄선된 주요 뉴스들의 통합 리스트")

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
    
    # 1. 모든 피드의 기사 후보군을 메모리에 대량 적재
    feeds_candidates = [] # index == feed_index
    for feed_index, feed in enumerate(RSS_FEEDS):
        print(f"[{feed_index}] Fetching {feed['category']} news from {feed['outlet']}...")
        parsed = feedparser.parse(feed["url"])
        
        candidate_entries = []
        for entry in parsed.entries:
            if any(keyword in entry.title for keyword in SKIP_KEYWORDS):
                continue
            candidate_entries.append(entry)
            if len(candidate_entries) >= 30:
                break
        feeds_candidates.append(candidate_entries)

    # 2. 통합 프롬프트 작성
    prompt_text = "당신은 최고의 글로벌 뉴스 편집장입니다. 다음은 여러 언론사에서 수집된 최신 기사 제목들입니다.\n"
    prompt_text += "각 언론사(Feed)별로 요청된 [Target 개수]만큼, 오늘 하루를 대표할 가장 비중 있고 중요한 '메인 헤드라인' 뉴스를 엄선하십시오.\n\n"
    
    for feed_index, feed in enumerate(RSS_FEEDS):
        candidate_entries = feeds_candidates[feed_index]
        if not candidate_entries:
            continue
        
        target_count = min(feed["limit"], len(candidate_entries))
        prompt_text += f"=== [Feed Index: {feed_index}] {feed['outlet']} (카테고리: {feed['category']}) | Target 개수: {target_count}개 ===\n"
        for idx, entry in enumerate(candidate_entries):
            prompt_text += f"ID: {idx} | Title: {entry.title}\n"
        prompt_text += "\n"
        
    prompt_text += "반드시 각 언론사별로 명시된 Target 개수만큼의 기사를 정확히 선택해야 합니다.\n"
    prompt_text += "최종 응답은 모든 선택된 기사를 하나의 배열(all_curated_articles)에 담아서 JSON 형태로 반환하십시오.\n"
    prompt_text += "선택된 기사의 feed_index, article_id, 100% 한국어로 번역된 제목, 그리고 3줄 요약을 포함해야 합니다."

    ai_success = False
    
    # API 호출이 불가능하거나 키가 없는 경우 대비
    if client:
        max_retries = 3
        for attempt in range(max_retries):
            try:
                print(f"Sending Grand Curation request to Gemini (Attempt {attempt + 1})...")
                # 단일 호출이므로 속도 제한 걱정 없음
                time.sleep(2.0)
                
                response = client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=prompt_text,
                    config={
                        "response_mime_type": "application/json",
                        "response_schema": GrandCurationResponse,
                    }
                )
                
                result_data = json.loads(response.text)
                curated_items = result_data.get("all_curated_articles", [])
                
                # 3. 반환된 데이터를 원본과 매핑
                for item in curated_items:
                    f_idx = item.get("feed_index")
                    a_idx = item.get("article_id")
                    
                    if f_idx is not None and a_idx is not None:
                        if 0 <= f_idx < len(RSS_FEEDS) and 0 <= a_idx < len(feeds_candidates[f_idx]):
                            feed = RSS_FEEDS[f_idx]
                            chosen_entry = feeds_candidates[f_idx][a_idx]
                            
                            all_news.append({
                                "category": feed["category"],
                                "outlet": feed["outlet"],
                                "title": item.get("translated_title", chosen_entry.title),
                                "link": chosen_entry.link,
                                "summary": item.get("summary", "요약을 불러오는 데 실패했습니다."),
                                "pub_date": parse_iso_date(chosen_entry)
                            })
                ai_success = True
                print(f"Successfully curated {len(all_news)} articles via AI.")
                break # 성공 시 재시도 루프 탈출
            except Exception as e:
                print(f"Batch AI Curation failed: {e}")
                if attempt < max_retries - 1:
                    time.sleep(20 * (attempt + 1))

    # 4. Fallback: AI 호출 완전 실패 시 단순 최신순으로 가져오기
    if not ai_success:
        print("Fallback to simple parsing for all feeds.")
        all_news = []
        for feed_index, feed in enumerate(RSS_FEEDS):
            candidate_entries = feeds_candidates[feed_index]
            target_count = min(feed["limit"], len(candidate_entries))
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
