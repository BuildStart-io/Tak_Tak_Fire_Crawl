async function testTopjobsScrape() {
  const res = await fetch('https://www.topjobs.lk/applicant/vacancybyfunctionalarea.jsp?FA=SDQ', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
  });
  const html = await res.text();
  const matches = [...html.matchAll(/createAlert\('([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)'/g)];
  console.log('Topjobs vacancy matches count:', matches.length);
  if (matches.length > 0) {
    const [_, rid, ac, jc, ec] = matches[0];
    const adUrl = `https://www.topjobs.lk/employer/JobAdvertismentServlet?rid=${rid}&ac=${ac}&jc=${jc}&ec=${ec}`;
    console.log('Testing advertisement URL:', adUrl);

    // Also look at the row in HTML to see title and company
    const firstRowMatch = html.match(/<tr[^>]*createAlert\('0'[\s\S]*?<\/tr>/i);
    if (firstRowMatch) {
      console.log('Row snippet:', firstRowMatch[0].slice(0, 300));
      const titleM = firstRowMatch[0].match(/<h2[^>]*>(.*?)<\/h2>/i);
      const compM = firstRowMatch[0].match(/<h1[^>]*>(.*?)<\/h1>/i);
      console.log('Extracted from Table Row -> Title:', titleM ? titleM[1].replace(/<[^>]+>/g, '').trim() : null);
      console.log('Extracted from Table Row -> Company:', compM ? compM[1].replace(/<[^>]+>/g, '').trim() : null);
    }

    const fcRes = await fetch('http://127.0.0.1:3002/v1/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: adUrl,
        formats: ['markdown', 'html']
      })
    });
    const fcData = await fcRes.json();
    console.log('Firecrawl scrape title:', fcData.data?.metadata?.title);
    console.log('Firecrawl markdown sample:', (fcData.data?.markdown || '').slice(0, 300));
  }
}
testTopjobsScrape();
