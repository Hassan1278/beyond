/**
 * The pictures in the feed, drawn rather than photographed.
 *
 * Flat, high-contrast, slightly over-lit - the visual grammar of a posted
 * highlight. Abstract on purpose: nobody real is being held up as the problem,
 * and the page carries no licensing risk. Swap any of these for a licensed
 * photograph by replacing the <svg> with an <img> of the same aspect ratio.
 *
 * Nothing here is a fixed colour. The lit shapes are currentColor, inherited
 * from .post-art, and the backdrop is a CSS gradient between the two stops the
 * post carries - both of which come from the palette. The only literal is the
 * shading, which is black at a low opacity and so works under any theme.
 */
import type { CSSProperties, ReactElement } from 'react';
import type { ArtKind } from '../data/feed';

/** Soft top-light every post shares, so the wall reads as one surface. */
function Light({ id }: { id: string }): ReactElement {
  return (
    <radialGradient id={id} cx="50%" cy="8%" r="78%">
      <stop offset="0%" stopColor="currentColor" stopOpacity="0.26" />
      <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
    </radialGradient>
  );
}

const SHAPES: Record<ArtKind, ReactElement> = {
  // Shoulders and a torso, lit from above.
  torso: (
    <g fill="currentColor" opacity="0.9">
      <path d="M200 96c19 0 34 15 34 34s-15 34-34 34-34-15-34-34 15-34 34-34Z" opacity=".55" />
      <path d="M200 176c44 0 78 22 92 58l14 142c-30 18-67 26-106 26s-76-8-106-26l14-142c14-36 48-58 92-58Z" />
      <path d="M200 200v176" stroke="#000" strokeWidth="5" opacity=".35" />
      <path
        d="M164 236c12 14 22 30 26 48M236 236c-12 14-22 30-26 48"
        stroke="#000"
        strokeWidth="4"
        fill="none"
        opacity=".3"
      />
    </g>
  ),
  // A fanned stack of notes.
  cash: (
    <g>
      {[0, 1, 2, 3].map((i) => (
        <rect
          key={i}
          x={96 + i * 6}
          y={190 - i * 22}
          width="210"
          height="104"
          rx="7"
          transform={`rotate(${-12 + i * 7} 200 240)`}
          fill="currentColor"
          opacity={0.32 + i * 0.2}
        />
      ))}
      <circle cx="206" cy="196" r="24" fill="#000" opacity=".32" />
    </g>
  ),
  // A watch face, read as status.
  watch: (
    <g fill="none" stroke="currentColor">
      <rect
        x="168"
        y="86"
        width="64"
        height="100"
        rx="26"
        fill="currentColor"
        opacity=".35"
        stroke="none"
      />
      <rect
        x="168"
        y="300"
        width="64"
        height="100"
        rx="26"
        fill="currentColor"
        opacity=".35"
        stroke="none"
      />
      <circle cx="200" cy="244" r="86" fill="currentColor" opacity=".92" stroke="none" />
      <circle cx="200" cy="244" r="68" stroke="#000" strokeWidth="3" opacity=".45" />
      <path
        d="M200 244V196M200 244l34 22"
        stroke="#000"
        strokeWidth="7"
        strokeLinecap="round"
        opacity=".7"
      />
    </g>
  ),
  // A low wedge of a car.
  car: (
    <g fill="currentColor">
      <path
        d="M64 290c26-6 44-36 74-50 34-16 90-18 128-4 26 10 52 32 70 44 10 7 4 24-10 24H74c-13 0-21-11-10-14Z"
        opacity=".92"
      />
      <path d="M150 246c26-10 70-12 100-2l20 28H132Z" fill="#000" opacity=".45" />
      <circle cx="132" cy="312" r="30" fill="#000" opacity=".6" />
      <circle cx="286" cy="312" r="30" fill="#000" opacity=".6" />
      <circle cx="132" cy="312" r="12" fill="currentColor" opacity=".8" />
      <circle cx="286" cy="312" r="12" fill="currentColor" opacity=".8" />
    </g>
  ),
  // A line that only goes up.
  chart: (
    <g>
      <path
        d="M72 356 150 300 212 324 290 206 338 168"
        fill="none"
        stroke="currentColor"
        strokeWidth="11"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M72 356 150 300 212 324 290 206 338 168v212H72Z" fill="currentColor" opacity=".16" />
      <circle cx="338" cy="168" r="15" fill="currentColor" />
      <path
        d="M296 150h52v52"
        fill="none"
        stroke="currentColor"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity=".7"
      />
    </g>
  ),
  // A phone held up to a mirror.
  mirror: (
    <g>
      <rect x="112" y="78" width="176" height="330" rx="26" fill="currentColor" opacity=".18" />
      <rect x="138" y="104" width="124" height="278" rx="14" fill="currentColor" opacity=".9" />
      <circle cx="200" cy="196" r="34" fill="#000" opacity=".3" />
      <path d="M160 322c10-30 26-46 40-46s30 16 40 46Z" fill="#000" opacity=".3" />
      <rect x="186" y="118" width="28" height="7" rx="3.5" fill="#000" opacity=".3" />
    </g>
  ),
  // A plate, mostly empty.
  meal: (
    <g>
      <circle cx="200" cy="248" r="118" fill="currentColor" opacity=".92" />
      <circle cx="200" cy="248" r="88" fill="none" stroke="#000" strokeWidth="3" opacity=".22" />
      <circle cx="172" cy="228" r="26" fill="#000" opacity=".25" />
      <circle cx="222" cy="252" r="18" fill="#000" opacity=".2" />
      <path
        d="M186 288c14 8 30 8 44 0"
        stroke="#000"
        strokeWidth="5"
        fill="none"
        opacity=".2"
        strokeLinecap="round"
      />
    </g>
  ),
  // A desk at an hour nobody asked for.
  desk: (
    <g>
      <rect x="92" y="150" width="216" height="140" rx="10" fill="currentColor" opacity=".9" />
      <rect x="116" y="174" width="168" height="92" rx="5" fill="#000" opacity=".42" />
      <path d="M64 306h272l-18 26H82Z" fill="currentColor" opacity=".55" />
      <rect x="132" y="196" width="104" height="8" rx="4" fill="currentColor" opacity=".55" />
      <rect x="132" y="216" width="72" height="8" rx="4" fill="currentColor" opacity=".4" />
      <circle cx="318" cy="120" r="22" fill="currentColor" opacity=".45" />
    </g>
  ),
  // A cup, raised.
  trophy: (
    <g fill="currentColor">
      <path d="M140 118h120v74c0 33-27 60-60 60s-60-27-60-60Z" opacity=".92" />
      <path
        d="M140 136h-28c0 36 13 58 34 64M260 136h28c0 36-13 58-34 64"
        fill="none"
        stroke="currentColor"
        strokeWidth="11"
        opacity=".7"
      />
      <rect x="186" y="252" width="28" height="56" opacity=".8" />
      <rect x="148" y="308" width="104" height="24" rx="6" opacity=".92" />
      <rect x="130" y="332" width="140" height="22" rx="6" opacity=".7" />
    </g>
  ),
  // Somewhere warm, obviously.
  beach: (
    <g>
      <circle cx="286" cy="138" r="52" fill="currentColor" opacity=".85" />
      <path
        d="M0 300c58-22 106-22 160 0s106 22 160 0 80-16 80-16v216H0Z"
        fill="currentColor"
        opacity=".22"
      />
      <path
        d="M0 336c58-22 106-22 160 0s106 22 160 0 80-16 80-16v180H0Z"
        fill="currentColor"
        opacity=".3"
      />
      <path
        d="M96 300c0-44 18-78 40-78s40 34 40 78"
        fill="none"
        stroke="currentColor"
        strokeWidth="9"
        opacity=".5"
      />
    </g>
  ),
};

export function FeedArt({
  kind,
  grad,
  id,
}: {
  kind: ArtKind;
  grad: [string, string];
  id: string;
}): ReactElement {
  return (
    <svg
      viewBox="0 0 400 500"
      className="post-art"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid slice"
      style={{ '--a': grad[0], '--b': grad[1] } as CSSProperties}
    >
      <defs>
        <Light id={`l-${id}`} />
      </defs>
      <rect width="400" height="500" fill={`url(#l-${id})`} />
      {SHAPES[kind]}
    </svg>
  );
}
