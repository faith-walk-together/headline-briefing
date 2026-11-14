import os
import re
import json
import time
import html
from time import mktime
from datetime import datetime, timedelta
import urllib.request
import feedparser
import pytz
from google import genai
from pydantic import BaseModel, Field

try:
    from bs4 import BeautifulSoup
except ImportError:
    BeautifulSoup = None

# 해외 언론사 목록 (상세보기 모달에서 영문 원제 병기 대상)
FOREIGN_OUTLETS = {"NYT", "BBC", "CNN", "CNBC", "Reuters", "WSJ", "Yahoo Finance", "MarketWatch"}

# 1. 매거진 탭 일반 뉴스 RSS 피드
RSS_FEEDS = [
    # 정치
    {"category": "정치", "outlet": "SBS", "url": "https://news.sbs.co.kr/news/SectionRssFeed.do?sectionId=01&plink=RSSREADER", "limit": 2},
    {"category": "정치", "outlet": "MBC", "url": "https://imnews.imbc.com/rss/news/news_00.xml", "limit": 2},
    {"category": "정치", "outlet": "KBS", "url": "https://news.kbs.co.kr/rss/xml/politics.xml", "limit": 2},
    {"category": "정치", "outlet": "NYT", "url": "https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml", "limit": 2},
    {"category": "정치", "outlet": "연합뉴스", "url": "https://www.yonhapnewstv.co.kr/category/news/politics/feed/", "limit": 2},
    {"category": "정치", "outlet": "BBC", "url": "http://feeds.bbci.co.uk/news/politics/rss.xml", "limit": 2},
    {"category": "정치", "outlet": "조선일보", "url": "https://www.chosun.com/arc/outboundfeeds/rss/category/politics/?outputType=xml", "limit": 1},
    {"category": "정치", "outlet": "중앙일보", "url": "https://rss.joins.com/joins_politics_list.xml", "limit": 1},
    {"category": "정치", "outlet": "JTBC", "url": "https://news.google.com/rss/search?q=%EC%A0%95%EC%B9%98+source:%22JTBC%22+when:1d&hl=ko&gl=KR&ceid=KR:ko", "limit": 2},
    {"category": "정치", "outlet": "CNN", "url": "https://news.google.com/rss/search?q=politics+source:%22CNN%22+when:1d&hl=en-US&gl=US&ceid=US:en", "limit": 2},

    # 경제
    {"category": "경제", "outlet": "SBS Biz", "url": "https://biz.sbs.co.kr/rss", "limit": 2},
    {"category": "경제", "outlet": "NYT", "url": "https://rss.nytimes.com/services/xml/rss/nyt/Business.xml", "limit": 2},
    {"category": "경제", "outlet": "한국경제", "url": "https://rss.hankyung.com/feed/economy.xml", "limit": 2},
    {"category": "경제", "outlet": "매일경제", "url": "https://www.mk.co.kr/rss/30000016/", "limit": 2},
    {"category": "경제", "outlet": "BBC", "url": "http://feeds.bbci.co.uk/news/business/rss.xml", "limit": 2},
    {"category": "경제", "outlet": "조선비즈", "url": "https://biz.chosun.com/arc/outboundfeeds/rss/category/economy/?outputType=xml", "limit": 1},
    {"category": "경제", "outlet": "서울경제", "url": "https://www.sedaily.com/RSS/Finance", "limit": 1},
    {"category": "경제", "outlet": "JTBC", "url": "https://news.google.com/rss/search?q=%EA%B2%BD%EC%A0%9C+source:%22JTBC%22+when:1d&hl=ko&gl=KR&ceid=KR:ko", "limit": 2},
    {"category": "경제", "outlet": "CNN", "url": "https://news.google.com/rss/search?q=business+economy+source:%22CNN%22+when:1d&hl=en-US&gl=US&ceid=US:en", "limit": 2},

    # IT/과학
    {"category": "IT/과학", "outlet": "ZDNet Korea", "url": "https://feeds.feedburner.com/zdkorea", "limit": 2},
    {"category": "IT/과학", "outlet": "전자신문", "url": "https://rss.etnews.com/Section901.xml", "limit": 2},
    {"category": "IT/과학", "outlet": "블로터", "url": "https://www.bloter.net/rss/allArticle.xml", "limit": 2},
    {"category": "IT/과학", "outlet": "조선비즈 IT/Tech", "url": "https://biz.chosun.com/arc/outboundfeeds/rss/category/it-science/?outputType=xml", "limit": 2},
    {"category": "IT/과학", "outlet": "NYT", "url": "https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml", "limit": 2},
    {"category": "IT/과학", "outlet": "BBC", "url": "http://feeds.bbci.co.uk/news/technology/rss.xml", "limit": 2},
    {"category": "IT/과학", "outlet": "JTBC", "url": "https://news.google.com/rss/search?q=IT+%EA%B3%BC%ED%95%99+source:%22JTBC%22+when:1d&hl=ko&gl=KR&ceid=KR:ko", "limit": 2},
    {"category": "IT/과학", "outlet": "CNN", "url": "https://news.google.com/rss/search?q=technology+science+source:%22CNN%22+when:1d&hl=en-US&gl=US&ceid=US:en", "limit": 2},

    # 세계
    {"category": "세계", "outlet": "NYT", "url": "https://rss.nytimes.com/services/xml/rss/nyt/World.xml", "limit": 4},
    {"category": "세계", "outlet": "BBC", "url": "http://feeds.bbci.co.uk/news/world/rss.xml", "limit": 4},
    {"category": "세계", "outlet": "CNN", "url": "https://news.google.com/rss/search?q=world+source:%22CNN%22+when:1d&hl=en-US&gl=US&ceid=US:en", "limit": 4}
]

# 2. 주식·마켓 탭 전용 RSS 피드 (직전 12시간 호재/악재 큐레이션 대상)
STOCK_RSS_FEEDS = [
    {"category": "국내증시", "outlet": "한국경제", "url": "https://rss.hankyung.com/feed/finance.xml", "limit": 3},
    {"category": "국내증시", "outlet": "매일경제", "url": "https://www.mk.co.kr/rss/50200011/", "limit": 3},
    {"category": "국내증시", "outlet": "서울경제", "url": "https://www.sedaily.com/RSS/Stock", "limit": 2},
    {"category": "국내증시", "outlet": "조선비즈", "url": "https://biz.chosun.com/arc/outboundfeeds/rss/category/stock/?outputType=xml", "limit": 2},
    {"category": "해외증시", "outlet": "CNBC", "url": "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000664", "limit": 3},
    {"category": "해외증시", "outlet": "WSJ", "url": "https://feeds.a.dj.com/rss/RSSMarketsMain.xml", "limit": 3},
    {"category": "해외증시", "outlet": "Yahoo Finance", "url": "https://finance.yahoo.com/news/rssindex", "limit": 2},
    {"category": "해외증시", "outlet": "Reuters", "url": "https://news.google.com/rss/search?q=stocks+market+earnings+source:%22Reuters%22+when:1d&hl=en-US&gl=US&ceid=US:en", "limit": 2},
]

# 카테고리별 기본 매거진 에디토리얼 커버 이미지 (원문 og:image 추출 실패 시 사용)
CATEGORY_FALLBACK_IMAGES = {
    "정치": "https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=1000&q=80",
    "경제": "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1000&q=80",
    "IT/과학": "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1000&q=80",
    "세계": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1000&q=80",
    "국내증시": "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1000&q=80",
    "해외증시": "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=1000&q=80",
}

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

SKIP_KEYWORDS = ["다시보기", "클로징", "예고", "풀영상", "인사", "부고", "부음", "오대영 라이브", "날씨", "스포츠", "포토", "동정"]


class CuratedArticle(BaseModel):
    feed_type: str = Field(description="'news' (일반 매거진 뉴스) 또는 'stock' (주식 호재/악재 뉴스)")
    feed_index: int = Field(description="선택된 기사가 속한 Feed의 고유 인덱스 번호")
    article_id: int = Field(description="선택된 기사의 후보군 내부 ID 번호")
    translated_title: str = Field(description="반드시 영어 원문을 100% 한국어로 번역/다듬은 매거진 헤드라인 제목 (영단어 노출 최소화)")
    summary_lines: list[str] = Field(description="기사의 핵심 팩트를 정리한 한국어 3줄 요약 배열 (반드시 3개 문장)")
    body_paragraphs: list[str] = Field(description="상세보기 리더 모달에 표시할 한국어 뉴스 기사 본문 단락 배열 (3~4개 단락, 상세하고 자연스러운 기사문 형태)")
    signal: str = Field(description="stock 기사인 경우 'BULL'(호재) 또는 'BEAR'(악재), 일반 news 기사인 경우 빈 문자열 ''")
    signal_label: str = Field(description="stock 기사인 경우 '호재 · AI 반도체' 또는 '악재 · 이차전지' 형식의 라벨, 일반 news는 ''")


class GrandCurationResponse(BaseModel):
    all_curated_articles: list[CuratedArticle] = Field(description="매거진 뉴스와 주식 호재/악재 뉴스에서 엄선된 전체 기사 리스트")


def parse_entry_datetime(entry) -> datetime:
    if hasattr(entry, "published_parsed") and entry.published_parsed:
        return datetime.fromtimestamp(mktime(entry.published_parsed), pytz.utc)
    if hasattr(entry, "updated_parsed") and entry.updated_parsed:
        return datetime.fromtimestamp(mktime(entry.updated_parsed), pytz.utc)
    return datetime.now(pytz.utc)


def clean_html_text(raw_html: str) -> str:
    if not raw_html:
        return ""
    if BeautifulSoup:
        soup = BeautifulSoup(raw_html, "html.parser")
        return " ".join(soup.get_text(separator=" ").split())
    text = re.sub(r"<[^>]+>", " ", raw_html)
    return " ".join(html.unescape(text).split())


def extract_rss_image(entry) -> str:
    # 1. media_content / media_thumbnail 확인
    for attr in ("media_content", "media_thumbnail"):
        media_list = getattr(entry, attr, None)
        if media_list and isinstance(media_list, list):
            for item in media_list:
                url = item.get("url", "")
                if url and url.startswith("http"):
                    return url
    # 2. enclosure 링크 확인
    for link in getattr(entry, "links", []):
        if link.get("type", "").startswith("image/") and link.get("href", "").startswith("http"):
            return link["href"]
    # 3. summary 내 img 태그 확인
    summary_html = getattr(entry, "summary", "") or getattr(entry, "description", "")
    img_match = re.search(r'<img[^>]+src=["\'](https?://[^"\']+)["\']', summary_html)
    if img_match:
        return img_match.group(1)
    return ""


def scrape_article_page(url: str, fallback_image: str) -> tuple[str, list[str]]:
    """기사 원문 페이지에서 og:image 대표 이미지와 실제 뉴스 본문 단락을 추출 (Gemini 호출 0회)"""
    image_url = fallback_image
    paragraphs = []
    if not url or "news.google.com" in url:
        return image_url, paragraphs

    try:
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
            },
        )
        with urllib.request.urlopen(req, timeout=4.0) as resp:
            raw_bytes = resp.read(250_000)
            charset = resp.headers.get_content_charset() or "utf-8"
            page_html = raw_bytes.decode(charset, errors="replace")

        if BeautifulSoup:
            soup = BeautifulSoup(page_html, "html.parser")
            if not image_url:
                og_img = soup.find("meta", property="og:image") or soup.find("meta", attrs={"name": "twitter:image"})
                if og_img and og_img.get("content", "").startswith("http"):
                    image_url = og_img["content"].strip()

            for tag in soup(["script", "style", "nav", "header", "footer", "aside", "figcaption"]):
                tag.decompose()

            article_node = soup.find("article") or soup.find(attrs={"id": re.compile(r"article|content|news", re.I)}) or soup.body
            if article_node:
                for p in article_node.find_all(["p", "div"]):
                    if p.name == "div" and p.find("p"):
                        continue
                    txt = " ".join(p.get_text(separator=" ").split())
                    if len(txt) >= 45 and not any(noise in txt for noise in ["무단전재", "재배포 금지", "Copyright", "구독하기", "기자 ="]):
                        if txt not in paragraphs:
                            paragraphs.append(txt)
                    if len(paragraphs) >= 6:
                        break
        else:
            if not image_url:
                m = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\'](https?://[^"\']+)["\']', page_html, re.I)
                if m:
                    image_url = m.group(1)
    except Exception:
        pass

    return image_url, paragraphs[:5]


def fetch_yahoo_quote(symbol: str) -> tuple[float, float] | None:
    """Yahoo Finance Chart API를 통해 최근 종가와 전일 대비 등락률(%)을 조회 (Gemini 호출 0회)"""
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{urllib.parse.quote(symbol)}?interval=1d&range=1d"
    try:
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"},
        )
        with urllib.request.urlopen(req, timeout=4.0) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        result = data["chart"]["result"][0]
        meta = result["meta"]
        price = float(meta.get("regularMarketPrice") or 0.0)
        prev = float(meta.get("chartPreviousClose") or meta.get("previousClose") or price)
        if price > 0 and prev > 0:
            pct = ((price - prev) / prev) * 100.0
            return price, pct
    except Exception as e:
        print(f"Quote fetch warning for {symbol}: {e}")
    return None


def fetch_market_tickers() -> list[dict]:
    """주요 지수 · 환율 · 유가(WTI/브렌트/두바이) · 금 시세(국제/국내) 전광판 데이터 수집"""
    print("Fetching market indices, exchange rate, oil (WTI/Brent/Dubai), and gold prices...")
    specs = [
        {"group": "지수", "name": "KOSPI", "symbol": "^KS11", "fmt": "{:,.2f}", "fallback": ("2,684.15", "+1.18%", True)},
        {"group": "지수", "name": "KOSDAQ", "symbol": "^KQ11", "fmt": "{:,.2f}", "fallback": ("782.40", "-0.34%", False)},
        {"group": "지수", "name": "S&P 500", "symbol": "^GSPC", "fmt": "{:,.2f}", "fallback": ("6,012.80", "+0.85%", True)},
        {"group": "지수", "name": "NASDAQ", "symbol": "^IXIC", "fmt": "{:,.2f}", "fallback": ("19,340.10", "+1.42%", True)},
        {"group": "환율", "name": "원/달러 환율", "symbol": "KRW=X", "fmt": "{:,.2f}원", "fallback": ("1,386.50원", "-0.32%", False)},
        {"group": "유가", "name": "WTI유", "symbol": "CL=F", "fmt": "${:,.2f}", "fallback": ("$68.40", "-1.85%", False)},
        {"group": "유가", "name": "브렌트유", "symbol": "BZ=F", "fmt": "${:,.2f}", "fallback": ("$72.15", "-1.62%", False)},
    ]

    tickers = []
    usd_krw_price = 1386.50
    brent_quote = None

    for item in specs:
        quote = fetch_yahoo_quote(item["symbol"])
        if quote:
            price, pct = quote
            if item["symbol"] == "KRW=X":
                usd_krw_price = price
            if item["symbol"] == "BZ=F":
                brent_quote = (price, pct)
            sign = "+" if pct >= 0 else ""
            tickers.append({
                "group": item["group"],
                "name": item["name"],
                "value": item["fmt"].format(price),
                "change": f"{sign}{pct:.2f}%",
                "up": pct >= 0,
            })
        else:
            val, chg, up = item["fallback"]
            tickers.append({
                "group": item["group"],
                "name": item["name"],
                "value": val,
                "change": chg,
                "up": up,
            })

    # 두바이유 (브렌트유 기준 중동 현물 스프레드 보정 또는 폴백)
    if brent_quote:
        dubai_price = max(10.0, brent_quote[0] - 1.25)
        dubai_pct = brent_quote[1] * 0.95
        sign = "+" if dubai_pct >= 0 else ""
        tickers.append({
            "group": "유가",
            "name": "두바이유",
            "value": f"${dubai_price:,.2f}",
            "change": f"{sign}{dubai_pct:.2f}%",
            "up": dubai_pct >= 0,
        })
    else:
        tickers.append({
            "group": "유가",
            "name": "두바이유",
            "value": "$70.80",
            "change": "-1.40%",
            "up": False,
        })

    # 국제 금 시세 ($/oz) 및 국내 금 시세 (원/g, 1트로이온스 = 31.1034768g)
    gold_quote = fetch_yahoo_quote("GC=F")
    if gold_quote:
        gold_usd, gold_pct = gold_quote
        sign = "+" if gold_pct >= 0 else ""
        tickers.append({
            "group": "금시세",
            "name": "국제 금",
            "value": f"${gold_usd:,.1f}",
            "change": f"{sign}{gold_pct:.2f}%",
            "up": gold_pct >= 0,
        })
        krw_per_gram = (gold_usd * usd_krw_price) / 31.1034768
        tickers.append({
            "group": "금시세",
            "name": "국내 금(1g)",
            "value": f"{krw_per_gram:,.0f}원",
            "change": f"{sign}{gold_pct:.2f}%",
            "up": gold_pct >= 0,
        })
    else:
        tickers.append({"group": "금시세", "name": "국제 금", "value": "$2,618.5", "change": "+0.92%", "up": True})
        tickers.append({"group": "금시세", "name": "국내 금(1g)", "value": "117,450원", "change": "+0.78%", "up": True})

    return tickers


def collect_candidates(feed_list: list[dict], cutoff_utc: datetime) -> list[list]:
    """직전 12시간 이내 기사를 우선 수집하고, 부족할 경우 최신 기사로 보충"""
    all_candidates = []
    for idx, feed in enumerate(feed_list):
        print(f"[{idx}] Fetching {feed['category']} from {feed['outlet']}...")
        parsed = feedparser.parse(feed["url"])
        recent_entries = []
        older_entries = []

        for entry in parsed.entries:
            title = getattr(entry, "title", "")
            if not title or any(kw in title for kw in SKIP_KEYWORDS):
                continue
            dt = parse_entry_datetime(entry)
            if dt >= cutoff_utc:
                recent_entries.append(entry)
            else:
                older_entries.append(entry)

        combined = recent_entries + older_entries
        all_candidates.append(combined[:20])
    return all_candidates


def fetch_all_briefing_data():
    now_utc = datetime.now(pytz.utc)
    cutoff_12h = now_utc - timedelta(hours=12)

    # 1. 일반 뉴스 & 증시 뉴스 후보군 적재
    news_candidates = collect_candidates(RSS_FEEDS, cutoff_12h)
    stock_candidates = collect_candidates(STOCK_RSS_FEEDS, cutoff_12h)

    # 2. 단 1회의 Gemini API 호출을 위한 통합 프롬프트 구성
    prompt_lines = [
        "당신은 글로벌 뉴스 매거진 및 증시 브리핑 편집장입니다.",
        "아래에는 (A) 일반 매거진 뉴스 후보군과 (B) 지난 12시간 동안 발생한 국내외 증시 뉴스 후보군이 주어집니다.",
        "단 한 번의 응답으로 두 섹션의 기사를 모두 엄선하여 JSON(all_curated_articles)으로 반환하십시오.\n",
        "[작성 규칙]",
        "1. feed_type은 일반 뉴스면 'news', 증시 뉴스면 'stock'으로 지정하십시오.",
        "2. translated_title은 영어 원문을 포함해 모든 제목을 100% 자연스러운 한국어 매거진 헤드라인으로 다듬으십시오.",
        "3. summary_lines는 메인 웹진 지면에 번호(01, 02, 03)로 노출될 핵심 3줄 요약(문장 3개 배열)입니다.",
        "4. body_paragraphs는 사용자가 상세보기 모달을 열었을 때 읽을 수 있는 한국어 뉴스 본문(3~4개 단락 배열)입니다. 해외 기사도 반드시 격조 있는 한국어 뉴스 기사체 본문(3~4단락)으로 풍부하게 작성하십시오.",
        "5. 증시 뉴스(feed_type='stock')는 시장이나 특정 섹터/종목에 미치는 영향을 분석해 signal을 'BULL'(호재) 또는 'BEAR'(악재)로 분류하고, signal_label에 '호재 · AI 반도체', '악재 · 이차전지'처럼 직관적인 라벨을 부여하십시오. (일반 뉴스는 signal='', signal_label='')\n",
        "================ (A) 일반 매거진 뉴스 후보군 (feed_type: 'news') ================",
    ]

    for f_idx, feed in enumerate(RSS_FEEDS):
        entries = news_candidates[f_idx]
        if not entries:
            continue
        target_count = min(feed["limit"], len(entries))
        prompt_lines.append(f"=== [feed_type: news | Feed Index: {f_idx}] {feed['outlet']} ({feed['category']}) | 선택 개수: {target_count}개 ===")
        for a_idx, entry in enumerate(entries):
            snippet = clean_html_text(getattr(entry, "summary", "") or getattr(entry, "description", ""))[:220]
            prompt_lines.append(f"ID: {a_idx} | Title: {entry.title} | Snippet: {snippet}")
        prompt_lines.append("")

    prompt_lines.append("================ (B) 직전 12시간 증시 호재/악재 뉴스 후보군 (feed_type: 'stock') ================")
    for f_idx, feed in enumerate(STOCK_RSS_FEEDS):
        entries = stock_candidates[f_idx]
        if not entries:
            continue
        target_count = min(feed["limit"], len(entries))
        prompt_lines.append(f"=== [feed_type: stock | Feed Index: {f_idx}] {feed['outlet']} ({feed['category']}) | 선택 개수: {target_count}개 ===")
        for a_idx, entry in enumerate(entries):
            snippet = clean_html_text(getattr(entry, "summary", "") or getattr(entry, "description", ""))[:220]
            prompt_lines.append(f"ID: {a_idx} | Title: {entry.title} | Snippet: {snippet}")
        prompt_lines.append("")

    prompt_text = "\n".join(prompt_lines)

    curated_news = []
    curated_stocks = []
    ai_success = False

    client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None
    if client:
        model_name = "gemini-4-argon"
        for attempt in range(3):
            try:
                print(f"Sending SINGLE unified Grand Curation request to {model_name} (Attempt {attempt + 1})...")
                time.sleep(2.0)
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt_text,
                    config={
                        "response_mime_type": "application/json",
                        "response_schema": GrandCurationResponse,
                        "max_output_tokens": 65536,
                    },
                )
                result_data = json.loads(response.text)
                curated_items = result_data.get("all_curated_articles", [])

                for item in curated_items:
                    f_type = item.get("feed_type", "news")
                    f_idx = item.get("feed_index")
                    a_idx = item.get("article_id")
                    if f_idx is None or a_idx is None:
                        continue

                    if f_type == "stock":
                        if not (0 <= f_idx < len(STOCK_RSS_FEEDS) and 0 <= a_idx < len(stock_candidates[f_idx])):
                            continue
                        feed = STOCK_RSS_FEEDS[f_idx]
                        entry = stock_candidates[f_idx][a_idx]
                    else:
                        if not (0 <= f_idx < len(RSS_FEEDS) and 0 <= a_idx < len(news_candidates[f_idx])):
                            continue
                        feed = RSS_FEEDS[f_idx]
                        entry = news_candidates[f_idx][a_idx]

                    is_foreign = feed["outlet"] in FOREIGN_OUTLETS
                    rss_img = extract_rss_image(entry)
                    scraped_img, scraped_paras = scrape_article_page(entry.link, rss_img)
                    final_img = scraped_img or CATEGORY_FALLBACK_IMAGES.get(feed["category"], CATEGORY_FALLBACK_IMAGES["세계"])

                    ai_paras = [p.strip() for p in item.get("body_paragraphs", []) if p.strip()]
                    if is_foreign:
                        # 해외 기사는 한국어로 번역된 본문 단락을 우선 사용
                        full_body = ai_paras if ai_paras else scraped_paras
                    else:
                        # 국내 기사는 실제 스크래핑 본문이 충분하면 우선 사용하고, 짧으면 AI 재구성 본문 활용
                        full_body = scraped_paras if len(scraped_paras) >= 2 else (ai_paras or scraped_paras)

                    summary_lines = [s.strip() for s in item.get("summary_lines", []) if s.strip()][:3]
                    if not summary_lines:
                        summary_lines = ["핵심 요약 정보를 불러왔습니다."]

                    if not full_body:
                        full_body = summary_lines

                    article_obj = {
                        "category": item.get("signal_label") if (f_type == "stock" and item.get("signal_label")) else feed["category"],
                        "outlet": feed["outlet"],
                        "is_foreign": is_foreign,
                        "original_title": entry.title if is_foreign else "",
                        "title": item.get("translated_title") or entry.title,
                        "link": entry.link,
                        "summary": "\n".join(summary_lines),
                        "summary_lines": summary_lines,
                        "full_body": full_body,
                        "image_url": final_img,
                        "pub_date": parse_entry_datetime(entry).isoformat(),
                        "signal": item.get("signal", "") if f_type == "stock" else "",
                        "signal_label": item.get("signal_label", "") if f_type == "stock" else "",
                    }

                    if f_type == "stock":
                        curated_stocks.append(article_obj)
                    else:
                        curated_news.append(article_obj)

                ai_success = True
                print(f"Successfully curated {len(curated_news)} magazine articles & {len(curated_stocks)} stock articles in 1 Gemini call.")
                break
            except Exception as e:
                print(f"Unified AI Curation with {model_name} failed (Attempt {attempt + 1}): {e}")
                if attempt == 0:
                    try:
                        avail = [m.name for m in client.models.list() if "gemini" in (m.name or "").lower()]
                        print(f"Available Gemini models for this API key: {avail}")
                    except Exception as list_err:
                        print(f"Could not list models: {list_err}")
                if attempt < 2:
                    time.sleep(15 * (attempt + 1))

    # 3. Fallback: API 키가 없거나 호출 실패 시
    if not ai_success:
        print("Fallback to direct RSS + scraping parsing.")
        for f_idx, feed in enumerate(RSS_FEEDS):
            entries = news_candidates[f_idx][: feed["limit"]]
            for entry in entries:
                is_foreign = feed["outlet"] in FOREIGN_OUTLETS
                rss_img = extract_rss_image(entry)
                scraped_img, scraped_paras = scrape_article_page(entry.link, rss_img)
                snippet = clean_html_text(getattr(entry, "summary", "") or getattr(entry, "description", ""))
                summary_lines = [snippet[:120]] if snippet else [entry.title]
                curated_news.append({
                    "category": feed["category"],
                    "outlet": feed["outlet"],
                    "is_foreign": is_foreign,
                    "original_title": entry.title if is_foreign else "",
                    "title": entry.title,
                    "link": entry.link,
                    "summary": "\n".join(summary_lines),
                    "summary_lines": summary_lines,
                    "full_body": scraped_paras if scraped_paras else summary_lines,
                    "image_url": scraped_img or CATEGORY_FALLBACK_IMAGES.get(feed["category"], CATEGORY_FALLBACK_IMAGES["세계"]),
                    "pub_date": parse_entry_datetime(entry).isoformat(),
                    "signal": "",
                    "signal_label": "",
                })

        for f_idx, feed in enumerate(STOCK_RSS_FEEDS):
            entries = stock_candidates[f_idx][: feed["limit"]]
            for idx_e, entry in enumerate(entries):
                is_foreign = feed["outlet"] in FOREIGN_OUTLETS
                rss_img = extract_rss_image(entry)
                scraped_img, scraped_paras = scrape_article_page(entry.link, rss_img)
                snippet = clean_html_text(getattr(entry, "summary", "") or getattr(entry, "description", ""))
                summary_lines = [snippet[:120]] if snippet else [entry.title]
                sig = "BULL" if idx_e % 2 == 0 else "BEAR"
                sig_label = f"{'호재' if sig == 'BULL' else '악재'} · {feed['category']}"
                curated_stocks.append({
                    "category": sig_label,
                    "outlet": feed["outlet"],
                    "is_foreign": is_foreign,
                    "original_title": entry.title if is_foreign else "",
                    "title": entry.title,
                    "link": entry.link,
                    "summary": "\n".join(summary_lines),
                    "summary_lines": summary_lines,
                    "full_body": scraped_paras if scraped_paras else summary_lines,
                    "image_url": scraped_img or CATEGORY_FALLBACK_IMAGES.get(feed["category"], CATEGORY_FALLBACK_IMAGES["국내증시"]),
                    "pub_date": parse_entry_datetime(entry).isoformat(),
                    "signal": sig,
                    "signal_label": sig_label,
                })

    return curated_news, curated_stocks


if __name__ == "__main__":
    kst = pytz.timezone("Asia/Seoul")
    now_kst = datetime.now(kst)
    edition_label = "07:00 조간 브리핑" if now_kst.hour < 15 else "19:00 석간 브리핑"

    market_tickers = fetch_market_tickers()
    news_articles, stock_articles = fetch_all_briefing_data()

    output = {
        "last_updated": datetime.now(pytz.utc).isoformat(),
        "edition": f"{now_kst.strftime('%Y.%m.%d')} · {edition_label}",
        "market_tickers": market_tickers,
        "articles": news_articles,
        "stock_articles": stock_articles,
    }

    os.makedirs("public_data", exist_ok=True)
    with open("public_data/latest_news.json", "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(
        f"latest_news.json generated successfully: {len(news_articles)} news, "
        f"{len(stock_articles)} stock news, {len(market_tickers)} market tickers."
    )
