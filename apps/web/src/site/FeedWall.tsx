/**
 * The feed that will not stop.
 *
 * This is the site's one piece of ambient motion, and it is an argument rather
 * than a decoration: two columns crawl in opposite directions, forever, and
 * there is no end of the list to reach. It pauses on hover and on keyboard
 * focus, and holds still entirely under prefers-reduced-motion.
 *
 * `quiet` is what "step beyond the noise" does to it: the motion stops, the
 * colour drains, the wall falls back. That contrast is the whole pitch.
 */
import { useMemo, type ReactElement } from 'react';
import { FEED, type Post } from '../data/feed';
import { FeedArt } from './FeedArt';

function Card({ post, idx }: { post: Post; idx: number }): ReactElement {
  return (
    <article className="post">
      <header className="post-top">
        <span className="post-ring" aria-hidden="true" />
        <span className="post-who">
          @{post.handle}
          <svg viewBox="0 0 24 24" className="tick" aria-hidden="true">
            <path
              d="m12 2 2.4 2.1 3.2-.4 1 3 2.9 1.3-1 3.1 1 3.1-2.9 1.3-1 3-3.2-.4L12 22l-2.4-2.1-3.2.4-1-3L2.5 16l1-3.1-1-3.1L5.4 8.5l1-3 3.2.4Z"
              fill="currentColor"
            />
            <path
              d="m8.6 12.2 2.4 2.4 4.6-4.8"
              fill="none"
              stroke="#12141a"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        {post.sponsored && <span className="post-ad">Sponsored</span>}
      </header>
      <FeedArt kind={post.art} grad={post.grad} id={`${idx}`} />
      <div className="post-foot">
        <p className="post-cap">{post.caption}</p>
        <p className="post-num">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 20s-7.5-4.6-7.5-9.4A4.3 4.3 0 0 1 12 7.8a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20Z"
              fill="currentColor"
            />
          </svg>
          {post.metric}
        </p>
      </div>
    </article>
  );
}

/** One column, its content duplicated so the loop has no visible seam. */
function Column({
  posts,
  dir,
  offset,
}: {
  posts: Post[];
  dir: 'up' | 'down';
  offset: number;
}): ReactElement {
  const run = useMemo(() => [...posts, ...posts], [posts]);
  return (
    <div className={`feed-col ${dir}`}>
      <div className="feed-run">
        {run.map((p, i) => (
          <Card key={`${p.handle}-${i}`} post={p} idx={offset + i} />
        ))}
      </div>
    </div>
  );
}

export function FeedWall({
  quiet = false,
  columns = 2,
}: {
  quiet?: boolean;
  columns?: 2 | 3;
}): ReactElement {
  const half = Math.ceil(FEED.length / 2);
  const left = FEED.slice(0, half);
  const right = FEED.slice(half);
  const mid = [...FEED.slice(2), ...FEED.slice(0, 2)];

  return (
    <div
      className={`feed-wall${quiet ? ' quiet' : ''}`}
      aria-label="An endless feed of other people's highlights"
      role="img"
    >
      <Column posts={left} dir="up" offset={0} />
      {columns === 3 && <Column posts={mid} dir="down" offset={40} />}
      <Column posts={right} dir="down" offset={20} />
    </div>
  );
}

/**
 * A single horizontal run of captions, for pages where the full wall would
 * repeat itself. Same argument, different axis, so the two never feel like
 * the same component used twice.
 */
export function FeedTicker(): ReactElement {
  const run = [...FEED, ...FEED];
  return (
    <div className="ticker" aria-label="Captions from an endless feed" role="img">
      <div className="ticker-run">
        {run.map((p, i) => (
          <span className="tick-item" key={`${p.handle}-${i}`}>
            <span className="tick-at">@{p.handle}</span>
            {p.caption}
            <span className="tick-n">{p.metric}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
