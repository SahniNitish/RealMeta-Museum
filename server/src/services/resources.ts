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
    const search = await axios.get('https://en.wikipedia.org/w/api.php', {
      params: {
        action: 'query',
        list: 'search',
        srsearch: query,
        format: 'json',
        srlimit: 1,
        origin: '*',
      },
    });
    const page = search.data?.query?.search?.[0];
    if (!page) return null;

    const pageId = page.pageid;
    const detail = await axios.get('https://en.wikipedia.org/w/api.php', {
      params: {
        action: 'query',
        prop: 'extracts|info',
        exintro: 1,
        explaintext: 1,
        pageids: pageId,
        inprop: 'url',
        format: 'json',
        origin: '*',
      },
    });

    const pageInfo = detail.data?.query?.pages?.[pageId];
    const description: string | undefined = pageInfo?.extract;
    const fullurl: string | undefined = pageInfo?.fullurl;

    return {
      title: page.title,
      description: description || 'No description available',
      sources: fullurl ? [{ provider: 'wikipedia', url: fullurl }] : [],
    };
  } catch {
    return null;
  }
}


