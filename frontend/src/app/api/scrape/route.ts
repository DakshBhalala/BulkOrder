import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 });

    let cleanUrl = url;
    if (!cleanUrl.startsWith('http')) cleanUrl = 'https://' + cleanUrl;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 1 minute timeout for heavy Playwright scraping

    try {
      // Proxy the request to our powerful Python Playwright backend
      const pythonRes = await fetch("http://localhost:8000/api/scrape/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: cleanUrl }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (pythonRes.ok) {
        const pythonData = await pythonRes.json();
        if (pythonData.success && pythonData.title) {
          let pTitle = pythonData.title;
          const lower = pTitle.toLowerCase();
          if (lower === 'amazon.in' || lower === 'amazon' || lower === 'flipkart' || lower === 'flipkart.com' || lower.includes('robot check') || lower.includes('online shopping') || lower.includes('page not found') || lower.includes('404')) {
            pTitle = '';
          }
          if (pTitle) {
            return NextResponse.json({ 
              title: pTitle,
              price: pythonData.price,
              originalPrice: pythonData.originalPrice,
              discount: pythonData.discount,
              rating: pythonData.rating,
              seller: pythonData.seller,
              basePrice: pythonData.basePrice,
              gstAmount: pythonData.gstAmount
            });
          }
        }
      }
    } catch (e) {
      console.warn("Python backend scrape failed or not running. Falling back...", e);
      clearTimeout(timeoutId);
    }

    // Fallback: Extremely basic HTML title grab if Python backend isn't available
    const fallbackRes = await fetch(cleanUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    });

    if (fallbackRes.ok) {
      const html = await fallbackRes.text();
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      let title = titleMatch ? titleMatch[1].trim() : '';

      if (title) {
        title = title.replace(/\s*\|.*$/, '').replace(/\s*- Buy.*$/i, '').replace(/\s*: Buy.*$/i, '').replace(/\s*Buy.*$/i, '');
        const lower = title.toLowerCase();
        if (lower === 'amazon.in' || lower === 'amazon' || lower === 'flipkart' || lower === 'flipkart.com' || lower.includes('robot check') || lower.includes('online shopping')) {
          title = '';
        }
      }
      return NextResponse.json({ title: title || null });
    }

    return NextResponse.json({ title: null });

  } catch (error: unknown) {
    console.error("Scraping error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to fetch url' }, { status: 500 });
  }
}
