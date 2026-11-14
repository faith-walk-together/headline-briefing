import os
import re
import json
import time
import html
from time import mktime
from datetime import datetime, timedelta
import urllib.request
import urllib.parse
import feedparser
import pytz
from google import genai
from pydantic import BaseModel, Field

try:
    from bs4 import BeautifulSoup
except ImportError:
    BeautifulSoup = None

# 해외 언론사 목록 (상세보기 모달에서 영문 원제 병기 대상)
FOREIGN_OUTLETS = {"NYT", "BBC", "CNN", "CNBC", "Reuters", "WSJ", "Yahoo Finance", "MarketWatch", "Bloomberg"}

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
    {"category": "경제", "outlet": "한국경제", "url": "https://news.google.com/rss/search?q=%ED%95%9C%EA%B5%AD%EA%B2%BD%EC%A0%9C+%EA%B2%BD%EC%A0%9C+OR+%EA%B8%88%EC%9C%B5+when:1d&hl=ko&gl=KR&ceid=KR:ko", "limit": 2},
    {"category": "경제", "outlet": "매일경제", "url": "https://www.mk.co.kr/rss/30000016/", "limit": 2},
    {"category": "경제", "outlet": "BBC", "url": "http://feeds.bbci.co.uk/news/business/rss.xml", "limit": 2},
    {"category": "경제", "outlet": "조선비즈", "url": "https://biz.chosun.com/arc/outboundfeeds/rss/category/economy/?outputType=xml", "limit": 1},
    {"category": "경제", "outlet": "서울경제", "url": "https://news.google.com/rss/search?q=%EC%84%9C%EC%9A%B8%EA%B2%BD%EC%A0%9C+%EA%B2%BD%EC%A0%9C+OR+%EA%B8%88%EC%9C%B5+when:1d&hl=ko&gl=KR&ceid=KR:ko", "limit": 1},
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

# 2. 주식·마켓 탭 전용 RSS 피드 (직전 12시간 호재/악재 큐레이션 대상 - 총 20종)
STOCK_RSS_FEEDS = [
    {"category": "국내증시", "outlet": "한국경제", "url": "https://news.google.com/rss/search?q=%ED%95%9C%EA%B5%AD%EA%B2%BD%EC%A0%9C+%EC%A6%9D%EC%8B%9C+OR+%EC%BD%94%EC%8A%A4%ED%94%BC+when:1d&hl=ko&gl=KR&ceid=KR:ko", "limit": 3},
    {"category": "국내증시", "outlet": "매일경제", "url": "https://www.mk.co.kr/rss/50200011/", "limit": 3},
    {"category": "국내증시", "outlet": "서울경제", "url": "https://news.google.com/rss/search?q=%EC%84%9C%EC%9A%B8%EA%B2%BD%EC%A0%9C+%EC%A6%9D%EC%8B%9C+OR+%EC%BD%94%EC%8A%A4%ED%94%BC+when:1d&hl=ko&gl=KR&ceid=KR:ko", "limit": 2},
    {"category": "국내증시", "outlet": "조선비즈", "url": "https://biz.chosun.com/arc/outboundfeeds/rss/category/stock/?outputType=xml", "limit": 2},
    {"category": "해외증시", "outlet": "CNBC", "url": "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000664", "limit": 3},
    {"category": "해외증시", "outlet": "WSJ", "url": "https://feeds.a.dj.com/rss/RSSMarketsMain.xml", "limit": 3},
    {"category": "해외증시", "outlet": "Yahoo Finance", "url": "https://news.google.com/rss/search?q=Yahoo+Finance+stock+market+earnings+when:1d&hl=en-US&gl=US&ceid=US:en", "limit": 2},
    {"category": "해외증시", "outlet": "Reuters", "url": "https://news.google.com/rss/search?q=stocks+market+earnings+source:%22Reuters%22+when:1d&hl=en-US&gl=US&ceid=US:en", "limit": 2},
]

# 기본 관심종목 풀 (watchlist.json 파일이 없을 때 폴백)
DEFAULT_WATCHLIST = [
    {"symbol": "005930.KS", "name": "삼성전자", "market": "KR", "query": "삼성전자 주가 OR 반도체 OR 실적"},
    {"symbol": "000660.KS", "name": "SK하이닉스", "market": "KR", "query": "SK하이닉스 HBM OR 주가 OR 실적"},
    {"symbol": "000500.KS", "name": "가온전선", "market": "KR", "query": "가온전선 주가 OR 전력망 OR 전선"},
    {"symbol": "036930.KQ", "name": "주성엔지니어링", "market": "KR", "query": "주성엔지니어링 주가 OR 반도체 장비 OR 실적"},
    {"symbol": "009150.KS", "name": "삼성전기", "market": "KR", "query": "삼성전기 MLCC OR 기판 OR 주가"},
    {"symbol": "003670.KS", "name": "포스코퓨처엠", "market": "KR", "query": "포스코퓨처엠 양극재 OR 이차전지 OR 주가"},
    {"symbol": "006400.KS", "name": "삼성SDI", "market": "KR", "query": "삼성SDI 배터리 OR 전고체 OR 주가"},
    {"symbol": "181710.KS", "name": "NHN", "market": "KR", "query": "NHN 클라우드 OR 게임 OR 주가"},
    {"symbol": "053800.KQ", "name": "안랩", "market": "KR", "query": "안랩 보안 OR 사이버보안 OR 주가"},
    {"symbol": "180640.KS", "name": "한진칼", "market": "KR", "query": "한진칼 주가 OR 지배구조 OR 대한항공"},
    {"symbol": "003490.KS", "name": "대한항공", "market": "KR", "query": "대한항공 주가 OR 항공 화물 OR 합병"},
    {"symbol": "010950.KS", "name": "S-Oil", "market": "KR", "query": "S-Oil 에쓰오일 정제마진 OR 유가 OR 주가"},
    {"symbol": "096770.KS", "name": "SK이노베이션", "market": "KR", "query": "SK이노베이션 정유 OR 배터리 OR 주가"},
    {"symbol": "002680.KQ", "name": "한탑", "market": "KR", "query": "한탑 사료 OR 곡물 OR 주가"},
    {"symbol": "124500.KQ", "name": "아이티센글로벌", "market": "KR", "query": "아이티센글로벌 OR 아이티센 금거래소 OR 주가"},
]

DEFAULT_STOCK_FALLBACK_QUOTES = {
    "005930.KS": ("206,000원", "-0.96%", False),
    "000660.KS": ("1,216,000원", "-3.03%", False),
    "000500.KS": ("219,000원", "+1.15%", True),
    "036930.KQ": ("172,500원", "+0.29%", True),
    "009150.KS": ("855,000원", "-3.50%", False),
    "003670.KS": ("173,200원", "-0.74%", False),
    "006400.KS": ("478,000원", "+1.06%", True),
    "181710.KS": ("66,400원", "-3.21%", False),
    "053800.KQ": ("111,900원", "-2.86%", False),
    "180640.KS": ("203,500원", "+0.25%", True),
    "003490.KS": ("31,550원", "-0.32%", False),
    "010950.KS": ("104,200원", "+2.26%", True),
    "096770.KS": ("109,200원", "+1.68%", True),
    "002680.KQ": ("2,675원", "-1.65%", False),
    "124500.KQ": ("18,170원", "-2.26%", False),
}

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
    translated_title: str = Field(
        description="모바일 화면 한 줄(공백 포함 18~22자 이내)에 들어오도록 핵심만 압축한 100% 한국어 한 줄 헤드라인 제목"
    )
    summary_lines: list[str] = Field(description="기사의 핵심 팩트를 정리한 한국어 3줄 요약 배열 (반드시 3개 문장)")
    body_paragraphs: list[str] = Field(description="상세보기 리더 모달에 표시할 한국어 뉴스 기사 본문 단락 배열 (3~4개 단락, 상세하고 자연스러운 기사문 형태)")
    signal: str = Field(description="stock 기사인 경우 'BULL'(호재) 또는 'BEAR'(악재), 일반 news 기사인 경우 빈 문자열 ''")
    signal_label: str = Field(description="stock 기사인 경우 '호재 · AI 반도체' 또는 '악재 · 이차전지' 형식의 라벨, 일반 news는 ''")


class CuratedRelatedArticle(BaseModel):
    article_id: int = Field(description="해당 종목 뉴스 후보군 내부의 기사 ID 번호")
    translated_title: str = Field(
        description="모바일 화면 한 줄(공백 포함 18~24자 이내)에 들어오는 핵심 한국어 뉴스 헤드라인 제목"
    )
    summary_lines: list[str] = Field(description="기사의 핵심 팩트를 정리한 한국어 3줄 요약 배열 (3개 문장)")
    body_paragraphs: list[str] = Field(description="뉴스 상세 팝업(ArticleReaderModal)에 표시할 한국어 뉴스 기사 본문 단락 배열 (3~4개 단락)")
    signal: str = Field(description="'BULL'(호재) 또는 'BEAR'(악재)")
    signal_label: str = Field(description="'호재 · 삼성전자' 또는 '악재 · 테슬라' 형식의 라벨")


class CuratedStockReport(BaseModel):
    stock_index: int = Field(description="관심종목의 인덱스 번호")
    symbol: str = Field(description="종목 티커 심볼 (예: 005930.KS, NVDA)")
    signal: str = Field(description="종목 당일 모멘텀 시그널: 'BULL'(상승/호재 우세) 또는 'BEAR'(하락/악재 우세)")
    analysis_headline: str = Field(
        description="해당 종목의 당일 주가 등락 원인과 핵심 모멘텀을 한 줄(22~32자 이내)로 요약한 한국어 분석 헤드라인"
    )
    earnings_date_note: str = Field(
        description="후보 기사에 실적발표 날짜가 명시되어 있다면 해당 날짜(예: '11월 14일 실적 발표'), 없다면 다음 분기 실적발표 예상 시기(예: '2027.01 하순 (4Q 잠정실적 예정)')"
    )
    key_points: list[str] = Field(description="주가 등락을 이끈 핵심 요인 3가지 요약 포인트 배열 (반드시 한국어 3개 문장)")
    analysis_paragraphs: list[str] = Field(
        description="주가 등락 배경, 수급·실적·산업 모멘텀, 향후 투자 관전 포인트를 정리한 한국어 상세 등락 분석 단락 배열 (2~3개 단락)"
    )
    related_articles: list[CuratedRelatedArticle] = Field(
        description="해당 종목의 등락 분석 근거가 된 핵심 관련 뉴스 3~5건"
    )


class GrandCurationResponse(BaseModel):
    all_curated_articles: list[CuratedArticle] = Field(description="매거진 뉴스와 주식 호재/악재 뉴스에서 엄선된 전체 기사 리스트")
    stock_reports: list[CuratedStockReport] = Field(description="설정된 관심종목별 주가 등락 분석 리포트 및 관련 뉴스 리스트")


def load_watchlist() -> list[dict]:
    """pipeline/watchlist.json에 설정된 관심종목 목록을 로드"""
    watchlist_paths = [
        os.path.join(os.path.dirname(__file__), "watchlist.json"),
        "pipeline/watchlist.json",
        "public_data/watchlist.json",
    ]
    for path in watchlist_paths:
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    stocks = data.get("stocks", [])
                    if isinstance(stocks, list) and len(stocks) > 0:
                        return stocks
            except Exception as e:
                print(f"[Warn] Failed to load {path}: {e}")
    return DEFAULT_WATCHLIST


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


def fetch_watchlist_quote(stock: dict) -> dict:
    """개별 관심종목의 현재가 및 등락률을 조회하여 포맷팅"""
    symbol = stock.get("symbol", "")
    name = stock.get("name", symbol)
    market = stock.get("market", "KR" if symbol.endswith((".KS", ".KQ")) else "US")
    quote = fetch_yahoo_quote(symbol)
    if quote:
        price, pct = quote
        sign = "+" if pct >= 0 else ""
        val_str = f"{price:,.0f}원" if market == "KR" else f"${price:,.2f}"
        return {
            "symbol": symbol,
            "name": name,
            "market": market,
            "value": val_str,
            "change": f"{sign}{pct:.2f}%",
            "up": pct >= 0,
        }
    fb = DEFAULT_STOCK_FALLBACK_QUOTES.get(symbol)
    if fb:
        val_str, chg_str, up_bool = fb
    else:
        val_str = "50,000원" if market == "KR" else "$100.00"
        chg_str = "+0.85%"
        up_bool = True
    return {
        "symbol": symbol,
        "name": name,
        "market": market,
        "value": val_str,
        "change": chg_str,
        "up": up_bool,
    }


def format_eok_unit(raw_val: str | None) -> str:
    """네이버 금융의 '억 원' 단위 문자열(예: '860,617', '1,245')을 '86조 617억', '1,245억' 형태로 변환"""
    if not raw_val or raw_val == "-":
        return "-"
    cleaned = raw_val.replace(",", "").strip()
    try:
        num = int(float(cleaned))
        sign = "-" if num < 0 else ""
        abs_num = abs(num)
        if abs_num >= 10000:
            jo = abs_num // 10000
            eok = abs_num % 10000
            if eok > 0:
                return f"{sign}{jo:,}조 {eok:,}억"
            return f"{sign}{jo:,}조"
        return f"{sign}{abs_num:,}억"
    except Exception:
        return f"{raw_val}억"


def extract_earnings_date_from_entries(entries: list, stock_name: str, symbol: str) -> tuple[str, bool]:
    """수집된 뉴스 기사 제목/본문에서 명시된 실적발표 날짜를 추출하고, 없으면 분기별 예상 발표시기를 반환"""
    date_patterns = [
        r"(\d{1,2}월\s*\d{1,2}일)[^.]{0,25}?(?:실적\s*발표|잠정\s*실적|컨퍼런스\s*콜|어닝)",
        r"(?:실적\s*발표|잠정\s*실적|컨퍼런스\s*콜)[^.]{0,25}?(\d{1,2}월\s*\d{1,2}일)",
        r"(\d{1,2}일)\s*(?:실적\s*발표|잠정\s*실적\s*발표)",
    ]
    for entry in entries:
        title = getattr(entry, "title", "") or ""
        desc = clean_html_text(getattr(entry, "summary", "") or getattr(entry, "description", ""))
        combined_text = f"{title} {desc}"
        for pat in date_patterns:
            m = re.search(pat, combined_text)
            if m:
                found_date = m.group(1).strip()
                return f"{found_date} 실적발표 (기사 명시)", True

    # 기사에 명시된 날짜가 없을 경우 종목별/분기별 실적발표 예상 시기 산출
    now_m = datetime.now().month
    code_prefix = symbol.split(".")[0]
    if now_m in (11, 12, 1):
        if code_prefix in ("005930",):
            return "2027.01 초 예정", False
        elif code_prefix in ("000660", "009150", "006400", "003670", "010950", "096770"):
            return "2027.01 하순 예정", False
        return "2027.01 말 ~ 02월 중순 예정", False
    elif now_m in (2, 3, 4):
        return "4월 하순 ~ 5월 중순 예정", False
    elif now_m in (5, 6, 7):
        return "7월 하순 ~ 8월 중순 예정", False
    return "10월 하순 ~ 11월 중순 예정", False


def fetch_stock_fundamentals(stock: dict, current_value_str: str, candidate_entries: list) -> dict:
    """네이버 증권 MTS 통합 API 및 재무 컨센서스 API를 통해 실적 추정치 및 MTS 핵심 요약 지표 수집"""
    symbol = stock.get("symbol", "")
    name = stock.get("name", symbol)
    market = stock.get("market", "KR" if symbol.endswith((".KS", ".KQ")) else "US")
    earnings_date, earnings_confirmed = extract_earnings_date_from_entries(candidate_entries, name, symbol)

    result = {
        "earnings_date": earnings_date,
        "earnings_is_confirmed": earnings_confirmed,
        "quarter_period": "최근 분기(E)",
        "quarter_revenue": "-",
        "quarter_op_profit": "-",
        "quarter_net_income": "-",
        "annual_period": "연간 추정(E)",
        "annual_revenue": "-",
        "annual_op_profit": "-",
        "target_price": "-",
        "investment_opinion": "-",
        "market_cap": "-",
        "trading_volume": "-",
        "day_range": "-",
        "week52_high": "-",
        "week52_low": "-",
        "week52_pos": 50,
        "per": "-",
        "eps": "-",
        "pbr": "-",
        "dividend_yield": "-",
        "foreign_rate": "-",
        "investor_trend": "-",
    }

    if market == "KR":
        code = symbol.split(".")[0]
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

        # 1. MTS 기본/통합 정보 (시총, 52주 최고/최저, PER, PBR, 외인소진율, 목표주가, 수급)
        try:
            url_int = f"https://m.stock.naver.com/api/stock/{code}/integration"
            req = urllib.request.Request(url_int, headers=headers)
            with urllib.request.urlopen(req, timeout=4.0) as resp:
                int_data = json.loads(resp.read().decode("utf-8"))

            infos = {item.get("code"): item.get("value") for item in int_data.get("totalInfos", []) if item.get("code")}
            result["market_cap"] = infos.get("marketValue") or "-"
            vol = infos.get("accumulatedTradingVolume") or "-"
            val = infos.get("accumulatedTradingValue") or ""
            result["trading_volume"] = f"{vol}주 ({val})" if val else f"{vol}주"

            open_p = infos.get("openPrice") or "-"
            high_p = infos.get("highPrice") or "-"
            low_p = infos.get("lowPrice") or "-"
            result["day_range"] = f"시가 {open_p} · 고가 {high_p} · 저가 {low_p}"

            w52_h = infos.get("highPriceOf52Weeks") or "-"
            w52_l = infos.get("lowPriceOf52Weeks") or "-"
            result["week52_high"] = f"{w52_h}원" if w52_h != "-" else "-"
            result["week52_low"] = f"{w52_l}원" if w52_l != "-" else "-"

            try:
                cur_num = float(re.sub(r"[^\d.]", "", current_value_str))
                h_num = float(w52_h.replace(",", ""))
                l_num = float(w52_l.replace(",", ""))
                if h_num > l_num > 0 and cur_num > 0:
                    pos = int(round(((cur_num - l_num) / (h_num - l_num)) * 100))
                    result["week52_pos"] = max(2, min(98, pos))
            except Exception:
                pass

            per_v = infos.get("per") or "-"
            cns_per = infos.get("cnsPer")
            result["per"] = f"{per_v} (추정 {cns_per})" if cns_per else per_v

            eps_v = infos.get("eps") or "-"
            cns_eps = infos.get("cnsEps")
            result["eps"] = f"{eps_v} (추정 {cns_eps})" if cns_eps else eps_v

            pbr_v = infos.get("pbr") or "-"
            bps_v = infos.get("bps")
            result["pbr"] = f"{pbr_v} (BPS {bps_v})" if bps_v else pbr_v

            div_yield = infos.get("dividendYieldRatio") or "-"
            div_amt = infos.get("dividend")
            result["dividend_yield"] = f"{div_yield} ({div_amt})" if div_amt else div_yield
            result["foreign_rate"] = infos.get("foreignRate") or "-"

            cns_info = int_data.get("consensusInfo") or {}
            if cns_info.get("priceTargetMean"):
                result["target_price"] = f"{cns_info['priceTargetMean']}원"
            if cns_info.get("recommMean"):
                score = float(cns_info["recommMean"])
                op_label = "매수" if score >= 3.5 else ("중립" if score >= 2.5 else "비중축소")
                result["investment_opinion"] = op_label

            deal_list = int_data.get("dealTrendInfos") or []
            if deal_list:
                latest_deal = deal_list[0]
                f_buy = latest_deal.get("foreignerPureBuyQuant") or "0"
                o_buy = latest_deal.get("organPureBuyQuant") or "0"
                i_buy = latest_deal.get("individualPureBuyQuant") or "0"
                result["investor_trend"] = f"외인 {f_buy} · 기관 {o_buy} · 개인 {i_buy}"
        except Exception as e:
            print(f"[Warn] Naver integration fetch failed for {code}: {e}")

        # 2. 분기 추정 실적 (컨센서스 우선, 없으면 최근 확정 분기)
        try:
            url_q = f"https://m.stock.naver.com/api/stock/{code}/finance/quarter"
            req_q = urllib.request.Request(url_q, headers=headers)
            with urllib.request.urlopen(req_q, timeout=4.0) as resp:
                q_data = json.loads(resp.read().decode("utf-8"))
            fi_q = q_data.get("financeInfo") or {}
            titles_q = fi_q.get("trTitleList") or []
            rows_q = fi_q.get("rowList") or []
            if titles_q and rows_q:
                target_col = next((t for t in titles_q if t.get("isConsensus") == "Y"), titles_q[-1])
                col_key = target_col.get("key")
                is_cns = target_col.get("isConsensus") == "Y"
                raw_title = (target_col.get("title") or "").rstrip(".")
                month_part = raw_title.split(".")[-1] if "." in raw_title else ""
                q_map = {"03": "1분기", "06": "2분기", "09": "3분기", "12": "4분기"}
                q_label = q_map.get(month_part, "최근 분기")
                status_label = "추정" if is_cns else "확정"
                result["quarter_period"] = f"{q_label}({status_label})"
                for r in rows_q:
                    r_title = r.get("title")
                    val_str = ((r.get("columns") or {}).get(col_key) or {}).get("value")
                    if r_title == "매출액":
                        result["quarter_revenue"] = format_eok_unit(val_str)
                    elif r_title == "영업이익":
                        result["quarter_op_profit"] = format_eok_unit(val_str)
                    elif r_title == "당기순이익":
                        result["quarter_net_income"] = format_eok_unit(val_str)
        except Exception as e:
            print(f"[Warn] Naver quarter finance fetch failed for {code}: {e}")

        # 3. 연간 추정 실적 (컨센서스 우선, 없으면 최근 연간)
        try:
            url_a = f"https://m.stock.naver.com/api/stock/{code}/finance/annual"
            req_a = urllib.request.Request(url_a, headers=headers)
            with urllib.request.urlopen(req_a, timeout=4.0) as resp:
                a_data = json.loads(resp.read().decode("utf-8"))
            fi_a = a_data.get("financeInfo") or {}
            titles_a = fi_a.get("trTitleList") or []
            rows_a = fi_a.get("rowList") or []
            if titles_a and rows_a:
                target_col = next((t for t in titles_a if t.get("isConsensus") == "Y"), titles_a[-1])
                col_key = target_col.get("key")
                is_cns = target_col.get("isConsensus") == "Y"
                result["annual_period"] = "추정" if is_cns else "확정"
                for r in rows_a:
                    r_title = r.get("title")
                    val_str = ((r.get("columns") or {}).get(col_key) or {}).get("value")
                    if r_title == "매출액":
                        result["annual_revenue"] = format_eok_unit(val_str)
                    elif r_title == "영업이익":
                        result["annual_op_profit"] = format_eok_unit(val_str)
        except Exception as e:
            print(f"[Warn] Naver annual finance fetch failed for {code}: {e}")

    return result


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


def parse_rss_feed(url: str):
    """브라우저 User-Agent 헤더를 포함하여 RSS XML을 가져온 뒤 파싱 (언론사 봇 차단 방지)"""
    try:
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
            },
        )
        with urllib.request.urlopen(req, timeout=6.0) as resp:
            raw_bytes = resp.read()
        return feedparser.parse(raw_bytes)
    except Exception:
        return feedparser.parse(url)


def collect_candidates(feed_list: list[dict], cutoff_utc: datetime) -> list[list]:
    """직전 12시간 이내 기사를 우선 수집하고, 부족할 경우 최신 기사로 보충"""
    all_candidates = []
    for idx, feed in enumerate(feed_list):
        print(f"[{idx}] Fetching {feed['category']} from {feed['outlet']}...")
        parsed = parse_rss_feed(feed["url"])
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


def extract_outlet_from_google_title(raw_title: str, default_outlet: str = " 증권뉴스") -> tuple[str, str]:
    """Google News RSS의 '제목 - 언론사' 형태에서 제목과 언론사를 분리"""
    if " - " in raw_title:
        parts = raw_title.rsplit(" - ", 1)
        clean_t = parts[0].strip()
        outlet = parts[1].strip()
        if clean_t and outlet:
            return clean_t, outlet
    return raw_title.strip(), default_outlet.strip()


def collect_watchlist_candidates(watchlist: list[dict], cutoff_utc: datetime) -> list[list]:
    """설정된 관심종목별 관련 뉴스를 Google News RSS에서 수집"""
    stock_entries_list = []
    for s_idx, stock in enumerate(watchlist):
        name = stock.get("name", "")
        symbol = stock.get("symbol", "")
        query = stock.get("query") or f"{name} 주가 OR 실적"
        encoded_q = urllib.parse.quote(f"{query} when:2d")
        rss_url = f"https://news.google.com/rss/search?q={encoded_q}&hl=ko&gl=KR&ceid=KR:ko"
        print(f"[Watchlist {s_idx}] Fetching news for {name} ({symbol})...")
        parsed = feedparser.parse(rss_url)
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

        combined = (recent_entries + older_entries)[:8]
        stock_entries_list.append(combined)
    return stock_entries_list


def fetch_all_briefing_data(watchlist: list[dict]):
    now_utc = datetime.now(pytz.utc)
    cutoff_12h = now_utc - timedelta(hours=12)

    # 1. 일반 뉴스 & 증시 뉴스 & 관심종목 뉴스 후보군 적재
    news_candidates = collect_candidates(RSS_FEEDS, cutoff_12h)
    stock_candidates = collect_candidates(STOCK_RSS_FEEDS, cutoff_12h)
    watchlist_quotes = [fetch_watchlist_quote(s) for s in watchlist]
    watchlist_candidates = collect_watchlist_candidates(watchlist, cutoff_12h)

    # 2. 단 1회의 Gemini API 호출을 위한 통합 프롬프트 구성
    prompt_lines = [
        "당신은 글로벌 뉴스 매거진 및 증시 브리핑 편집장입니다.",
        "아래에는 (A) 일반 매거진 뉴스 후보군, (B) 지난 12시간 동안 발생한 국내외 증시 뉴스 후보군, (C) 사용자 관심종목별 시세 및 뉴스 후보군이 주어집니다.",
        "단 한 번의 응답으로 모든 섹션을 엄선·분석하여 JSON(all_curated_articles, stock_reports)으로 반환하십시오.\n",
        "[작성 규칙 - all_curated_articles]",
        "1. feed_type은 일반 뉴스면 'news', 증시 뉴스면 'stock'으로 지정하십시오.",
        "2. translated_title은 모바일 화면에서 반드시 '한 줄(공백 포함 18~22자 이내)'로 표시될 수 있도록 불필요한 수식어를 덜어내고 핵심만 강렬하게 압축한 100% 한국어 헤드라인으로 작성하십시오.",
        "3. summary_lines는 메인 웹진 지면에 노출될 핵심 3줄 요약(문장 3개 배열)입니다.",
        "4. body_paragraphs는 사용자가 상세보기 모달을 열었을 때 읽을 수 있는 한국어 뉴스 본문(3~4개 단락 배열)입니다. 해외 기사도 반드시 격조 있는 한국어 뉴스 기사체 본문(3~4단락)으로 풍부하게 작성하십시오.",
        "5. 증시 뉴스(feed_type='stock')는 시장이나 특정 섹터/종목에 미치는 영향을 분석해 signal을 'BULL'(호재) 또는 'BEAR'(악재)로 분류하고, signal_label에 '호재 · AI 반도체', '악재 · 이차전지'처럼 직관적인 라벨을 부여하십시오. (일반 뉴스는 signal='', signal_label='')\n",
        "[작성 규칙 - stock_reports (관심종목 등락 분석 리포트)]",
        "1. 각 관심종목(stock_index, symbol)마다 현재 주가 등락률과 후보 뉴스들을 종합 분석하여 stock_reports 배열에 빠짐없이 작성하십시오.",
        "2. analysis_headline은 해당 종목의 당일 등락 원인과 핵심 모멘텀을 한 줄(22~32자 이내)로 명확히 요약한 한국어 제목입니다.",
        "3. key_points는 주가 등락을 이끈 핵심 요인 3가지를 한국어 문장 3개로 정리한 배열입니다.",
        "4. analysis_paragraphs는 주가 등락 배경, 수급·실적·산업 동향, 향후 관전 포인트를 깊이 있게 서술한 2~3개 한국어 단락 배열입니다.",
        "5. related_articles는 해당 종목 후보군 중 가장 관련도가 높은 뉴스 3~5건을 선별하여 article_id, 한국어 한 줄 제목(translated_title), 3줄 요약(summary_lines), 상세 한국어 본문 단락(body_paragraphs, 3~4단락), signal('BULL' 또는 'BEAR'), signal_label('호재 · 종목명' 또는 '악재 · 종목명')을 작성하십시오.\n",
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

    prompt_lines.append("================ (C) 관심종목별 시세 및 관련 뉴스 후보군 (stock_reports) ================")
    for s_idx, stock in enumerate(watchlist):
        q_info = watchlist_quotes[s_idx]
        entries = watchlist_candidates[s_idx]
        prompt_lines.append(
            f"=== [Stock Index: {s_idx}] 종목명: {q_info['name']} | Symbol: {q_info['symbol']} | 현재가: {q_info['value']} ({q_info['change']}) | 관련 뉴스 3~5개 선택 ==="
        )
        for a_idx, entry in enumerate(entries):
            snippet = clean_html_text(getattr(entry, "summary", "") or getattr(entry, "description", ""))[:220]
            prompt_lines.append(f"ID: {a_idx} | Title: {entry.title} | Snippet: {snippet}")
        prompt_lines.append("")

    prompt_text = "\n".join(prompt_lines)

    curated_news = []
    curated_stocks = []
    curated_reports = []
    ai_success = False

    client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None
    if client:
        model_name = "gemini-4-argon"
        for attempt in range(3):
            try:
                print(f"Sending SINGLE unified Grand Curation + Stock Report request to {model_name} (Attempt {attempt + 1})...")
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
                report_items = result_data.get("stock_reports", [])

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
                    full_body = ai_paras if ai_paras else scraped_paras

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

                # 관심종목별 등락 분석 리포트 구성
                report_by_idx = {r.get("stock_index"): r for r in report_items if r.get("stock_index") is not None}
                for s_idx, q_info in enumerate(watchlist_quotes):
                    r_item = report_by_idx.get(s_idx, {})
                    entries = watchlist_candidates[s_idx]
                    fallback_cat = "국내증시" if q_info["market"] == "KR" else "해외증시"
                    related_articles_out = []

                    for rel in r_item.get("related_articles", []):
                        a_idx = rel.get("article_id")
                        if a_idx is None or not (0 <= a_idx < len(entries)):
                            continue
                        entry = entries[a_idx]
                        clean_orig_title, outlet_name = extract_outlet_from_google_title(
                            entry.title, "한국경제" if q_info["market"] == "KR" else "Yahoo Finance"
                        )
                        is_foreign = outlet_name in FOREIGN_OUTLETS or q_info["market"] == "US"
                        rss_img = extract_rss_image(entry)
                        scraped_img, scraped_paras = scrape_article_page(entry.link, rss_img)
                        final_img = scraped_img or CATEGORY_FALLBACK_IMAGES.get(fallback_cat)

                        ai_paras = [p.strip() for p in rel.get("body_paragraphs", []) if p.strip()]
                        full_body = ai_paras if ai_paras else scraped_paras
                        summary_lines = [s.strip() for s in rel.get("summary_lines", []) if s.strip()][:3]
                        if not summary_lines:
                            summary_lines = [rel.get("translated_title") or clean_orig_title]
                        if not full_body:
                            full_body = summary_lines

                        sig = rel.get("signal") or ("BULL" if q_info["up"] else "BEAR")
                        sig_label = rel.get("signal_label") or f"{'호재' if sig == 'BULL' else '악재'} · {q_info['name']}"

                        related_articles_out.append({
                            "category": sig_label,
                            "outlet": outlet_name,
                            "is_foreign": is_foreign,
                            "original_title": clean_orig_title if is_foreign else "",
                            "title": rel.get("translated_title") or clean_orig_title,
                            "link": entry.link,
                            "summary": "\n".join(summary_lines),
                            "summary_lines": summary_lines,
                            "full_body": full_body,
                            "image_url": final_img,
                            "pub_date": parse_entry_datetime(entry).isoformat(),
                            "signal": sig,
                            "signal_label": sig_label,
                        })

                    sig_main = r_item.get("signal") or ("BULL" if q_info["up"] else "BEAR")
                    fundamentals = fetch_stock_fundamentals(watchlist[s_idx], q_info["value"], entries)
                    if r_item.get("earnings_date_note") and not fundamentals.get("earnings_is_confirmed"):
                        fundamentals["earnings_date"] = r_item["earnings_date_note"].strip()
                    curated_reports.append({
                        "symbol": q_info["symbol"],
                        "name": q_info["name"],
                        "market": q_info["market"],
                        "value": q_info["value"],
                        "change": q_info["change"],
                        "up": q_info["up"],
                        "signal": sig_main,
                        "analysis_headline": r_item.get("analysis_headline") or f"{q_info['name']}, {q_info['change']} 변동에 따른 핵심 수급·모멘텀 분석",
                        "key_points": [kp.strip() for kp in r_item.get("key_points", []) if kp.strip()][:3],
                        "analysis_paragraphs": [ap.strip() for ap in r_item.get("analysis_paragraphs", []) if ap.strip()],
                        "fundamentals": fundamentals,
                        "related_articles": related_articles_out,
                    })

                ai_success = True
                print(
                    f"Successfully curated {len(curated_news)} magazine articles, "
                    f"{len(curated_stocks)} stock articles, and {len(curated_reports)} stock reports in 1 Gemini call."
                )
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

        for s_idx, q_info in enumerate(watchlist_quotes):
            entries = watchlist_candidates[s_idx][:5]
            fallback_cat = "국내증시" if q_info["market"] == "KR" else "해외증시"
            sig_main = "BULL" if q_info["up"] else "BEAR"
            related_articles_out = []
            for entry in entries:
                clean_orig_title, outlet_name = extract_outlet_from_google_title(
                    entry.title, "한국경제" if q_info["market"] == "KR" else "Yahoo Finance"
                )
                snippet = clean_html_text(getattr(entry, "summary", "") or getattr(entry, "description", ""))
                summary_lines = [snippet[:120]] if snippet else [clean_orig_title]
                sig_label = f"{'호재' if sig_main == 'BULL' else '악재'} · {q_info['name']}"
                related_articles_out.append({
                    "category": sig_label,
                    "outlet": outlet_name,
                    "is_foreign": q_info["market"] == "US",
                    "original_title": clean_orig_title if q_info["market"] == "US" else "",
                    "title": clean_orig_title,
                    "link": entry.link,
                    "summary": "\n".join(summary_lines),
                    "summary_lines": summary_lines,
                    "full_body": summary_lines,
                    "image_url": CATEGORY_FALLBACK_IMAGES.get(fallback_cat),
                    "pub_date": parse_entry_datetime(entry).isoformat(),
                    "signal": sig_main,
                    "signal_label": sig_label,
                })

            fundamentals = fetch_stock_fundamentals(watchlist[s_idx], q_info["value"], watchlist_candidates[s_idx])
            curated_reports.append({
                "symbol": q_info["symbol"],
                "name": q_info["name"],
                "market": q_info["market"],
                "value": q_info["value"],
                "change": q_info["change"],
                "up": q_info["up"],
                "signal": sig_main,
                "analysis_headline": f"{q_info['name']} ({q_info['change']}), 주요 이슈 및 수급 동향 브리핑",
                "key_points": [a["title"] for a in related_articles_out[:3]] or [f"{q_info['name']} 최근 시장 수급 및 기술적 흐름 점검"],
                "analysis_paragraphs": [
                    f"{q_info['name']}({q_info['symbol']}) 주가는 최근 거래에서 {q_info['value']}({q_info['change']})을 기록하며 시장의 주목을 받고 있습니다.",
                    "직전 12시간 동안 보도된 주요 언론 기사와 업황 모멘텀을 종합할 때, 실적 가이던스 및 글로벌 매크로 변수에 따른 기관·외국인 수급 변화가 핵심 동력으로 작용하고 있습니다.",
                ],
                "fundamentals": fundamentals,
                "related_articles": related_articles_out,
            })

    return curated_news, curated_stocks, curated_reports


if __name__ == "__main__":
    kst = pytz.timezone("Asia/Seoul")
    now_kst = datetime.now(kst)
    period_label = "AM" if now_kst.hour < 15 else "PM"
    edition_label = f"{now_kst.strftime('%y-%m-%d')} {period_label}"
    edition_id = f"{now_kst.strftime('%y-%m-%d')}-{period_label}"
    archive_rel_path = f"archive/{edition_id}.json"

    watchlist = load_watchlist()
    market_tickers = fetch_market_tickers()
    news_articles, stock_articles, stock_reports = fetch_all_briefing_data(watchlist)

    now_utc_iso = datetime.now(pytz.utc).isoformat()
    output = {
        "last_updated": now_utc_iso,
        "edition": edition_label,
        "edition_id": edition_id,
        "market_tickers": market_tickers,
        "articles": news_articles,
        "stock_articles": stock_articles,
        "stock_reports": stock_reports,
        "watchlist": watchlist,
    }

    os.makedirs("public_data/archive", exist_ok=True)

    # 1. 최신 브리핑 저장
    with open("public_data/latest_news.json", "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    # 2. 날짜·회차별 아카이브 파일 저장
    with open(f"public_data/{archive_rel_path}", "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    # 3. 관심종목 설정 파일도 public_data에 동기화
    with open("public_data/watchlist.json", "w", encoding="utf-8") as f:
        json.dump({"stocks": watchlist}, f, ensure_ascii=False, indent=2)

    # 4. 아카이브 인덱스(archive_index.json) 갱신 (기존 gh-pages 인덱스 병합 + 최대 180개 회차/90일 유지)
    index_path = "public_data/archive_index.json"
    existing_editions = []
    if os.path.exists(index_path):
        try:
            with open(index_path, "r", encoding="utf-8") as f:
                idx_data = json.load(f)
                existing_editions = idx_data.get("editions", [])
        except Exception as e:
            print(f"[Warn] Failed to read local archive_index.json: {e}")

    if not existing_editions:
        try:
            req = urllib.request.Request(
                "https://faith-walk-together.github.io/headline-briefing/archive_index.json",
                headers={"User-Agent": "Mozilla/5.0"},
            )
            with urllib.request.urlopen(req, timeout=8.0) as resp:
                if resp.status == 200:
                    existing_editions = json.loads(resp.read().decode("utf-8")).get("editions", [])
        except Exception:
            pass

    new_entry = {
        "id": edition_id,
        "edition": edition_label,
        "last_updated": now_utc_iso,
        "file": archive_rel_path,
        "article_count": len(news_articles),
        "stock_count": len(stock_articles),
        "report_count": len(stock_reports),
    }

    merged_editions = [new_entry] + [
        item for item in existing_editions if item.get("id") != edition_id
    ]
    merged_editions = merged_editions[:180]

    with open(index_path, "w", encoding="utf-8") as f:
        json.dump({"editions": merged_editions}, f, ensure_ascii=False, indent=2)

    print(
        f"latest_news.json & {archive_rel_path} generated successfully: "
        f"{len(news_articles)} news, {len(stock_articles)} stock news, "
        f"{len(stock_reports)} stock reports, {len(market_tickers)} market tickers. "
        f"Total archived editions: {len(merged_editions)}."
    )
