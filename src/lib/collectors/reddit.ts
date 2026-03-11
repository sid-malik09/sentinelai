import type { Collector, CollectorResult, CollectedMention } from "./base";

interface RedditPost {
  data: {
    id: string;
    title: string;
    selftext: string;
    author: string;
    subreddit: string;
    permalink: string;
    score: number;
    num_comments: number;
    created_utc: number;
    url: string;
    upvote_ratio: number;
  };
}

interface RedditListingResponse {
  data: {
    children: RedditPost[];
    after: string | null;
  };
}

export class RedditCollector implements Collector {
  name = "reddit";
  private accessToken: string | null = null;
  private tokenExpiry = 0;

  private get clientId() {
    return process.env.REDDIT_CLIENT_ID ?? "";
  }
  private get clientSecret() {
    return process.env.REDDIT_CLIENT_SECRET ?? "";
  }
  private get username() {
    return process.env.REDDIT_USERNAME ?? "";
  }
  private get password() {
    return process.env.REDDIT_PASSWORD ?? "";
  }

  private get isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret && this.username && this.password);
  }

  private async authenticate(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const credentials = Buffer.from(
      `${this.clientId}:${this.clientSecret}`
    ).toString("base64");

    const res = await fetch("https://www.reddit.com/api/v1/access_token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "SentinelAI/1.0",
      },
      body: new URLSearchParams({
        grant_type: "password",
        username: this.username,
        password: this.password,
      }),
    });

    if (!res.ok) {
      throw new Error(`Reddit auth failed: ${res.status}`);
    }

    const data = await res.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + data.expires_in * 1000 - 60000;
    return this.accessToken!;
  }

  async collect(keywords: string[]): Promise<CollectorResult> {
    const mentions: CollectedMention[] = [];
    const errors: string[] = [];

    if (!this.isConfigured) {
      return {
        mentions: [],
        errors: ["Reddit API credentials not configured"],
      };
    }

    let token: string;
    try {
      token = await this.authenticate();
    } catch (err) {
      return {
        mentions: [],
        errors: [
          `Reddit auth error: ${err instanceof Error ? err.message : String(err)}`,
        ],
      };
    }

    for (const keyword of keywords) {
      try {
        const params = new URLSearchParams({
          q: keyword,
          sort: "new",
          t: "day",
          limit: "50",
          type: "link",
        });

        const res = await fetch(
          `https://oauth.reddit.com/search?${params}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "User-Agent": "SentinelAI/1.0",
            },
          }
        );

        if (!res.ok) {
          errors.push(`Reddit search failed for "${keyword}": ${res.status}`);
          continue;
        }

        const data: RedditListingResponse = await res.json();

        for (const post of data.data.children) {
          const p = post.data;
          const content = p.selftext || p.title;

          if (!content || content.length < 10) continue;

          mentions.push({
            source: "reddit",
            sourceId: `reddit-${p.id}`,
            sourceUrl: `https://reddit.com${p.permalink}`,
            author: p.author,
            title: p.title,
            content: p.selftext || p.title,
            publishedAt: new Date(p.created_utc * 1000),
            engagement: {
              score: p.score,
              comments: p.num_comments,
            },
            metadata: {
              subreddit: p.subreddit,
              upvoteRatio: p.upvote_ratio,
              url: p.url,
            },
          });
        }
      } catch (err) {
        errors.push(
          `Reddit collector error for "${keyword}": ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    return { mentions: deduplicateBySourceId(mentions), errors };
  }
}

function deduplicateBySourceId(
  mentions: CollectedMention[]
): CollectedMention[] {
  const seen = new Set<string>();
  return mentions.filter((m) => {
    if (seen.has(m.sourceId)) return false;
    seen.add(m.sourceId);
    return true;
  });
}
