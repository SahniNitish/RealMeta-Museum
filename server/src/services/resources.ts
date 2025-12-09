import axios from 'axios';

export interface ResourceInfo {
  title?: string;
  author?: string;
  year?: string;
  style?: string;
  description?: string;
  sources?: { provider: string; url: string }[];
}

export async function fetchFromWikipedia(query: string): Promise<ResourceInfo | null> {
  try {
    // Clean up the query - remove dates and normalize
    const cleanQuery = query
      .replace(/\(\d{4}-\d{4}\)/g, '') // Remove date ranges like (1452-1519)
      .replace(/\(c\.\s*\d+.*?\)/g, '') // Remove circa dates
      .replace(/\(.*?\)/g, '')  // Remove any parenthetical content
      .trim();

    console.log(`📚 Wikipedia search: "${cleanQuery}"`);

    const search = await axios.get('https://en.wikipedia.org/w/api.php', {
      params: {
        action: 'query',
        list: 'search',
        srsearch: cleanQuery,
        format: 'json',
        srlimit: 3, // Get top 3 results
        origin: '*',
      },
      timeout: 10000,
    });

    const pages = search.data?.query?.search;
    if (!pages || pages.length === 0) {
      console.log('⚠️ No Wikipedia results found');
      return null;
    }

    // Try to find best match - prefer exact title matches
    const page = pages.find((p: any) =>
      p.title.toLowerCase().includes(cleanQuery.toLowerCase().split(' ')[0])
    ) || pages[0];

    const pageId = page.pageid;
    console.log(`📖 Found Wikipedia page: "${page.title}"`);

    const detail = await axios.get('https://en.wikipedia.org/w/api.php', {
      params: {
        action: 'query',
        prop: 'extracts|info|pageimages',
        exintro: 0, // Get full extract, not just intro
        exsentences: 10, // Get up to 10 sentences
        explaintext: 1,
        pageids: pageId,
        inprop: 'url',
        format: 'json',
        origin: '*',
      },
      timeout: 10000,
    });

    const pageInfo = detail.data?.query?.pages?.[pageId];
    const description: string | undefined = pageInfo?.extract;
    const fullurl: string | undefined = pageInfo?.fullurl;

    console.log(`✅ Wikipedia description length: ${description?.length || 0} chars`);

    return {
      title: page.title,
      description: description || 'No description available',
      sources: fullurl ? [{ provider: 'wikipedia', url: fullurl }] : [],
    };
  } catch (error) {
    console.error('❌ Wikipedia fetch error:', error);
    return null;
  }
}


