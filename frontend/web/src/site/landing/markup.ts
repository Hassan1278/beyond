/* The landing page's markup, carried across from the standalone page.
   It stays markup: the page is rendered in one piece and then wired up by
   runLanding(), the same shape as the journal app next door. */
export const LANDING_MARKUP = String.raw`</head>
<body>

<div id="sky-bg" class="bui" aria-hidden="true"><span class="ambient" id="ambient"></span></div>
<nav class="nav" aria-label="Main">
  <div class="nav-in">
    <a class="logo" href="#top">beyond.</a>
    <div class="nav-links">
      <a href="#who">Who it's for</a>
      <a href="#how">How it works</a>
      <a href="#try">Try one night</a>
      <a href="#memory">Memory</a>
      <a href="#app">App</a>
      <a href="#schools">For schools</a>
    </div>
    <span class="clock" id="clock" title="The page moves from night to morning as you scroll"><i></i><span id="clockT">23:41</span></span>
    <a class="btn btn-light btn-sm" href="/app">Enter Beyond</a>
  </div>
</nav>

<header class="hero" id="top" data-time="23:41">
  <div class="noise" id="noise" aria-hidden="false">
    <button class="word" style="top:13%;left:6%;--s:56px;--r:-8deg;--t:7s" data-d="1.4">INTERNSHIP</button>
    <button class="word" style="top:19%;right:7%;--s:30px;--t:8s;--dl:-2s" data-d=".8">SUCCESS</button>
    <button class="word" style="bottom:21%;left:5%;--s:34px;--t:6.5s;--dl:-1s" data-d="1">PRODUCTIVITY</button>
    <button class="word" style="bottom:11%;right:9%;--s:58px;--r:8deg;--t:7.5s;--dl:-3s" data-d="1.5">FITNESS</button>
    <button class="word m-hide" style="top:42%;left:4%;--s:22px;--t:9s;--dl:-4s" data-d=".6">STARTUP</button>
    <button class="word m-hide" style="top:50%;right:4%;--s:26px;--t:7s;--dl:-2.5s" data-d=".9">EVERYONE IS AHEAD</button>
    <button class="word m-hide" style="top:10%;left:42%;--s:18px;--t:8.5s;--dl:-1.5s" data-d=".5">5AM ROUTINE</button>
    <button class="word m-hide" style="top:31%;left:3%;--s:20px;--r:4deg;--t:6s;--dl:-3.5s" data-d=".7">SIDE HUSTLE</button>
    <button class="word m-hide" style="top:31%;right:5%;--s:38px;--r:6deg;--t:8s;--dl:-.5s" data-d="1.2">DREAM JOB</button>
    <button class="word m-hide" style="bottom:33%;right:6%;--s:20px;--t:9s;--dl:-5s" data-d=".6">YOU'RE BEHIND</button>
    <button class="word" style="bottom:6%;left:27%;--s:22px;--r:-3deg;--t:7s;--dl:-2s" data-d=".8">PASSIVE INCOME</button>
    <button class="word" style="bottom:12%;left:6%;--s:28px;--t:8s;--dl:-4s" data-d="1">GLOW UP</button>
    <button class="word m-hide" style="top:15%;right:30%;--s:16px;--t:6.5s;--dl:-1s" data-d=".4">STUDY WITH ME</button>
    <button class="word m-hide" style="bottom:7%;right:36%;--s:18px;--r:5deg;--t:7.5s;--dl:-3s" data-d=".5">10X YOUR LIFE</button>
  </div>
  <div class="center">
    <p class="eyebrow">The Great Distraction</p>
    <h1>Everyone is telling you who to become.</h1>
    <p class="lede">Beyond gives you a space to step away from the noise, understand your own thoughts, and decide what actually matters.</p>
    <div class="hero-ctas">
      <button class="btn btn-light" id="quietBtn">Step beyond the noise</button>
      <a class="btn btn-ghost" href="#try">Try one night</a>
    </div>
  </div>
  <p class="hint" id="hint">Click any word to quiet it</p>
</header>

<section class="sec night" id="great" data-time="23:52">
  <div class="wrap">
        <ol class="eras">
      <li><span class="yr">1914–1918</span><span class="era">The Great War</span></li>
      <li><span class="yr">1929–1939</span><span class="era">The Great Depression</span></li>
      <li class="now"><span class="yr">Now</span><span class="era">The Great Distraction</span></li>
    </ol>
    <div class="great-grid">
      <p class="big">Every feed has a version of you that is further ahead. Scroll long enough and it gets hard to tell which goals were yours to begin with.</p>
      <ul class="symptoms">
        <li>Shorter attention spans</li>
        <li>A new life goal every trend cycle</li>
        <li>Insecurity about mind and body</li>
        <li>Less motivation to grow</li>
        <li>Nowhere to think out loud without being judged</li>
      </ul>
    </div>
  </div>
</section>

<section class="sec night feed-sec" id="feed" data-time="23:47">
  <div class="feed-layout">
    <div class="feed-copy">
      <p class="eyebrow">Every night, this</p>
      <h2>It never runs out.<br>That is the design.</h2>
      <p class="sub">There is no last post. Someone is always further ahead, and the feed will keep showing you until you close it. Scroll long enough and it gets hard to tell which goals were ever yours.</p>
      <div class="swap-stack">
        <div id="feedLoud">
          <div class="ctas"><button type="button" class="btn btn-light" id="putDown">Put it down</button></div>
        </div>
        <div id="feedQuiet" class="quiet-state" aria-live="polite" hidden>
          <p class="quiet-line">Quiet.</p>
          <p class="sub">Nothing is asking for your attention now. That is the whole idea behind Beyond: one place that does not compete for it.</p>
          <div class="ctas"><button type="button" class="btn btn-ghost" id="letBack">Let it back in</button></div>
        </div>
      </div>
    </div>
    <div class="feed-wall" id="feedWall" role="img" aria-label="An endless feed of other people's highlights">
      <div class="feed-col up"><div class="feed-run"><article class="post"><header class="post-top"><span class="post-ring" aria-hidden="true"></span><span class="post-who">@aidan.lifts<svg viewBox="0 0 24 24" class="vtick" aria-hidden="true"><path d="m12 2 2.4 2.1 3.2-.4 1 3 2.9 1.3-1 3.1 1 3.1-2.9 1.3-1 3-3.2-.4L12 22l-2.4-2.1-3.2.4-1-3L2.5 16l1-3.1-1-3.1L5.4 8.5l1-3 3.2.4Z" fill="currentColor"/><path d="m8.6 12.2 2.4 2.4 4.6-4.8" fill="none" stroke="var(--night-2)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span></header><span class="post-art" style="--a:color-mix(in srgb,var(--g4) 60%,var(--night));--b:var(--g1)" aria-hidden="true"></span><div class="post-foot"><p class="post-cap">5% body fat at 19. No excuses left.</p><p class="post-num"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7.5-4.6-7.5-9.4A4.3 4.3 0 0 1 12 7.8a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20Z" fill="currentColor"/></svg>412K</p></div></article><article class="post"><header class="post-top"><span class="post-ring" aria-hidden="true"></span><span class="post-who">@mayabuilds<svg viewBox="0 0 24 24" class="vtick" aria-hidden="true"><path d="m12 2 2.4 2.1 3.2-.4 1 3 2.9 1.3-1 3.1 1 3.1-2.9 1.3-1 3-3.2-.4L12 22l-2.4-2.1-3.2.4-1-3L2.5 16l1-3.1-1-3.1L5.4 8.5l1-3 3.2.4Z" fill="currentColor"/><path d="m8.6 12.2 2.4 2.4 4.6-4.8" fill="none" stroke="var(--night-2)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="post-ad">Sponsored</span></header><span class="post-art" style="--a:color-mix(in srgb,var(--dusk) 50%,var(--night));--b:var(--night-2)" aria-hidden="true"></span><div class="post-foot"><p class="post-cap">Dropped out at 20. $180k/mo. Ask me anything.</p><p class="post-num"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7.5-4.6-7.5-9.4A4.3 4.3 0 0 1 12 7.8a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20Z" fill="currentColor"/></svg>2.1M</p></div></article><article class="post"><header class="post-top"><span class="post-ring" aria-hidden="true"></span><span class="post-who">@skin.by.neve<svg viewBox="0 0 24 24" class="vtick" aria-hidden="true"><path d="m12 2 2.4 2.1 3.2-.4 1 3 2.9 1.3-1 3.1 1 3.1-2.9 1.3-1 3-3.2-.4L12 22l-2.4-2.1-3.2.4-1-3L2.5 16l1-3.1-1-3.1L5.4 8.5l1-3 3.2.4Z" fill="currentColor"/><path d="m8.6 12.2 2.4 2.4 4.6-4.8" fill="none" stroke="var(--night-2)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="post-ad">Sponsored</span></header><span class="post-art" style="--a:color-mix(in srgb,var(--dawn) 26%,var(--night));--b:var(--night-2)" aria-hidden="true"></span><div class="post-foot"><p class="post-cap">My 11-step routine. Start before 25 or it is already too late.</p><p class="post-num"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7.5-4.6-7.5-9.4A4.3 4.3 0 0 1 12 7.8a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20Z" fill="currentColor"/></svg>1.4M</p></div></article><article class="post"><header class="post-top"><span class="post-ring" aria-hidden="true"></span><span class="post-who">@the.focused.few<svg viewBox="0 0 24 24" class="vtick" aria-hidden="true"><path d="m12 2 2.4 2.1 3.2-.4 1 3 2.9 1.3-1 3.1 1 3.1-2.9 1.3-1 3-3.2-.4L12 22l-2.4-2.1-3.2.4-1-3L2.5 16l1-3.1-1-3.1L5.4 8.5l1-3 3.2.4Z" fill="currentColor"/><path d="m8.6 12.2 2.4 2.4 4.6-4.8" fill="none" stroke="var(--night-2)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span></header><span class="post-art" style="--a:color-mix(in srgb,var(--g3) 72%,var(--night));--b:var(--night)" aria-hidden="true"></span><div class="post-foot"><p class="post-cap">4:30am. While you were asleep.</p><p class="post-num"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7.5-4.6-7.5-9.4A4.3 4.3 0 0 1 12 7.8a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20Z" fill="currentColor"/></svg>89K</p></div></article><article class="post"><header class="post-top"><span class="post-ring" aria-hidden="true"></span><span class="post-who">@claraglow<svg viewBox="0 0 24 24" class="vtick" aria-hidden="true"><path d="m12 2 2.4 2.1 3.2-.4 1 3 2.9 1.3-1 3.1 1 3.1-2.9 1.3-1 3-3.2-.4L12 22l-2.4-2.1-3.2.4-1-3L2.5 16l1-3.1-1-3.1L5.4 8.5l1-3 3.2.4Z" fill="currentColor"/><path d="m8.6 12.2 2.4 2.4 4.6-4.8" fill="none" stroke="var(--night-2)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span></header><span class="post-art" style="--a:color-mix(in srgb,var(--g4) 70%,var(--dawn));--b:var(--g1)" aria-hidden="true"></span><div class="post-foot"><p class="post-cap">What I eat in a day — 1,200 calories.</p><p class="post-num"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7.5-4.6-7.5-9.4A4.3 4.3 0 0 1 12 7.8a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20Z" fill="currentColor"/></svg>1.2M</p></div></article><article class="post"><header class="post-top"><span class="post-ring" aria-hidden="true"></span><span class="post-who">@dev.ascend<svg viewBox="0 0 24 24" class="vtick" aria-hidden="true"><path d="m12 2 2.4 2.1 3.2-.4 1 3 2.9 1.3-1 3.1 1 3.1-2.9 1.3-1 3-3.2-.4L12 22l-2.4-2.1-3.2.4-1-3L2.5 16l1-3.1-1-3.1L5.4 8.5l1-3 3.2.4Z" fill="currentColor"/><path d="m8.6 12.2 2.4 2.4 4.6-4.8" fill="none" stroke="var(--night-2)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span></header><span class="post-art" style="--a:color-mix(in srgb,var(--g2) 80%,var(--moon));--b:var(--night)" aria-hidden="true"></span><div class="post-foot"><p class="post-cap">Three offers before finals. Resume in bio.</p><p class="post-num"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7.5-4.6-7.5-9.4A4.3 4.3 0 0 1 12 7.8a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20Z" fill="currentColor"/></svg>340K</p></div></article><article class="post"><header class="post-top"><span class="post-ring" aria-hidden="true"></span><span class="post-who">@grind.szn<svg viewBox="0 0 24 24" class="vtick" aria-hidden="true"><path d="m12 2 2.4 2.1 3.2-.4 1 3 2.9 1.3-1 3.1 1 3.1-2.9 1.3-1 3-3.2-.4L12 22l-2.4-2.1-3.2.4-1-3L2.5 16l1-3.1-1-3.1L5.4 8.5l1-3 3.2.4Z" fill="currentColor"/><path d="m8.6 12.2 2.4 2.4 4.6-4.8" fill="none" stroke="var(--night-2)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span></header><span class="post-art" style="--a:color-mix(in srgb,var(--dawn) 34%,var(--night));--b:var(--g1)" aria-hidden="true"></span><div class="post-foot"><p class="post-cap">Your twenties are supposed to hurt.</p><p class="post-num"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7.5-4.6-7.5-9.4A4.3 4.3 0 0 1 12 7.8a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20Z" fill="currentColor"/></svg>756K</p></div></article><article class="post"><header class="post-top"><span class="post-ring" aria-hidden="true"></span><span class="post-who">@aidan.lifts<svg viewBox="0 0 24 24" class="vtick" aria-hidden="true"><path d="m12 2 2.4 2.1 3.2-.4 1 3 2.9 1.3-1 3.1 1 3.1-2.9 1.3-1 3-3.2-.4L12 22l-2.4-2.1-3.2.4-1-3L2.5 16l1-3.1-1-3.1L5.4 8.5l1-3 3.2.4Z" fill="currentColor"/><path d="m8.6 12.2 2.4 2.4 4.6-4.8" fill="none" stroke="var(--night-2)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span></header><span class="post-art" style="--a:color-mix(in srgb,var(--g4) 60%,var(--night));--b:var(--g1)" aria-hidden="true"></span><div class="post-foot"><p class="post-cap">5% body fat at 19. No excuses left.</p><p class="post-num"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7.5-4.6-7.5-9.4A4.3 4.3 0 0 1 12 7.8a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20Z" fill="currentColor"/></svg>412K</p></div></article><article class="post"><header class="post-top"><span class="post-ring" aria-hidden="true"></span><span class="post-who">@mayabuilds<svg viewBox="0 0 24 24" class="vtick" aria-hidden="true"><path d="m12 2 2.4 2.1 3.2-.4 1 3 2.9 1.3-1 3.1 1 3.1-2.9 1.3-1 3-3.2-.4L12 22l-2.4-2.1-3.2.4-1-3L2.5 16l1-3.1-1-3.1L5.4 8.5l1-3 3.2.4Z" fill="currentColor"/><path d="m8.6 12.2 2.4 2.4 4.6-4.8" fill="none" stroke="var(--night-2)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="post-ad">Sponsored</span></header><span class="post-art" style="--a:color-mix(in srgb,var(--dusk) 50%,var(--night));--b:var(--night-2)" aria-hidden="true"></span><div class="post-foot"><p class="post-cap">Dropped out at 20. $180k/mo. Ask me anything.</p><p class="post-num"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7.5-4.6-7.5-9.4A4.3 4.3 0 0 1 12 7.8a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20Z" fill="currentColor"/></svg>2.1M</p></div></article><article class="post"><header class="post-top"><span class="post-ring" aria-hidden="true"></span><span class="post-who">@skin.by.neve<svg viewBox="0 0 24 24" class="vtick" aria-hidden="true"><path d="m12 2 2.4 2.1 3.2-.4 1 3 2.9 1.3-1 3.1 1 3.1-2.9 1.3-1 3-3.2-.4L12 22l-2.4-2.1-3.2.4-1-3L2.5 16l1-3.1-1-3.1L5.4 8.5l1-3 3.2.4Z" fill="currentColor"/><path d="m8.6 12.2 2.4 2.4 4.6-4.8" fill="none" stroke="var(--night-2)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="post-ad">Sponsored</span></header><span class="post-art" style="--a:color-mix(in srgb,var(--dawn) 26%,var(--night));--b:var(--night-2)" aria-hidden="true"></span><div class="post-foot"><p class="post-cap">My 11-step routine. Start before 25 or it is already too late.</p><p class="post-num"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7.5-4.6-7.5-9.4A4.3 4.3 0 0 1 12 7.8a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20Z" fill="currentColor"/></svg>1.4M</p></div></article><article class="post"><header class="post-top"><span class="post-ring" aria-hidden="true"></span><span class="post-who">@the.focused.few<svg viewBox="0 0 24 24" class="vtick" aria-hidden="true"><path d="m12 2 2.4 2.1 3.2-.4 1 3 2.9 1.3-1 3.1 1 3.1-2.9 1.3-1 3-3.2-.4L12 22l-2.4-2.1-3.2.4-1-3L2.5 16l1-3.1-1-3.1L5.4 8.5l1-3 3.2.4Z" fill="currentColor"/><path d="m8.6 12.2 2.4 2.4 4.6-4.8" fill="none" stroke="var(--night-2)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span></header><span class="post-art" style="--a:color-mix(in srgb,var(--g3) 72%,var(--night));--b:var(--night)" aria-hidden="true"></span><div class="post-foot"><p class="post-cap">4:30am. While you were asleep.</p><p class="post-num"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7.5-4.6-7.5-9.4A4.3 4.3 0 0 1 12 7.8a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20Z" fill="currentColor"/></svg>89K</p></div></article><article class="post"><header class="post-top"><span class="post-ring" aria-hidden="true"></span><span class="post-who">@claraglow<svg viewBox="0 0 24 24" class="vtick" aria-hidden="true"><path d="m12 2 2.4 2.1 3.2-.4 1 3 2.9 1.3-1 3.1 1 3.1-2.9 1.3-1 3-3.2-.4L12 22l-2.4-2.1-3.2.4-1-3L2.5 16l1-3.1-1-3.1L5.4 8.5l1-3 3.2.4Z" fill="currentColor"/><path d="m8.6 12.2 2.4 2.4 4.6-4.8" fill="none" stroke="var(--night-2)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span></header><span class="post-art" style="--a:color-mix(in srgb,var(--g4) 70%,var(--dawn));--b:var(--g1)" aria-hidden="true"></span><div class="post-foot"><p class="post-cap">What I eat in a day — 1,200 calories.</p><p class="post-num"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7.5-4.6-7.5-9.4A4.3 4.3 0 0 1 12 7.8a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20Z" fill="currentColor"/></svg>1.2M</p></div></article><article class="post"><header class="post-top"><span class="post-ring" aria-hidden="true"></span><span class="post-who">@dev.ascend<svg viewBox="0 0 24 24" class="vtick" aria-hidden="true"><path d="m12 2 2.4 2.1 3.2-.4 1 3 2.9 1.3-1 3.1 1 3.1-2.9 1.3-1 3-3.2-.4L12 22l-2.4-2.1-3.2.4-1-3L2.5 16l1-3.1-1-3.1L5.4 8.5l1-3 3.2.4Z" fill="currentColor"/><path d="m8.6 12.2 2.4 2.4 4.6-4.8" fill="none" stroke="var(--night-2)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span></header><span class="post-art" style="--a:color-mix(in srgb,var(--g2) 80%,var(--moon));--b:var(--night)" aria-hidden="true"></span><div class="post-foot"><p class="post-cap">Three offers before finals. Resume in bio.</p><p class="post-num"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7.5-4.6-7.5-9.4A4.3 4.3 0 0 1 12 7.8a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20Z" fill="currentColor"/></svg>340K</p></div></article><article class="post"><header class="post-top"><span class="post-ring" aria-hidden="true"></span><span class="post-who">@grind.szn<svg viewBox="0 0 24 24" class="vtick" aria-hidden="true"><path d="m12 2 2.4 2.1 3.2-.4 1 3 2.9 1.3-1 3.1 1 3.1-2.9 1.3-1 3-3.2-.4L12 22l-2.4-2.1-3.2.4-1-3L2.5 16l1-3.1-1-3.1L5.4 8.5l1-3 3.2.4Z" fill="currentColor"/><path d="m8.6 12.2 2.4 2.4 4.6-4.8" fill="none" stroke="var(--night-2)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span></header><span class="post-art" style="--a:color-mix(in srgb,var(--dawn) 34%,var(--night));--b:var(--g1)" aria-hidden="true"></span><div class="post-foot"><p class="post-cap">Your twenties are supposed to hurt.</p><p class="post-num"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7.5-4.6-7.5-9.4A4.3 4.3 0 0 1 12 7.8a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20Z" fill="currentColor"/></svg>756K</p></div></article></div></div>
      <div class="feed-col down"><div class="feed-run"><article class="post"><header class="post-top"><span class="post-ring" aria-hidden="true"></span><span class="post-who">@that.girl.era<svg viewBox="0 0 24 24" class="vtick" aria-hidden="true"><path d="m12 2 2.4 2.1 3.2-.4 1 3 2.9 1.3-1 3.1 1 3.1-2.9 1.3-1 3-3.2-.4L12 22l-2.4-2.1-3.2.4-1-3L2.5 16l1-3.1-1-3.1L5.4 8.5l1-3 3.2.4Z" fill="currentColor"/><path d="m8.6 12.2 2.4 2.4 4.6-4.8" fill="none" stroke="var(--night-2)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span></header><span class="post-art" style="--a:color-mix(in srgb,var(--g3) 66%,var(--moon));--b:var(--g1)" aria-hidden="true"></span><div class="post-foot"><p class="post-cap">5am. Pilates, matcha, journal, before anyone else is awake.</p><p class="post-num"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7.5-4.6-7.5-9.4A4.3 4.3 0 0 1 12 7.8a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20Z" fill="currentColor"/></svg>668K</p></div></article><article class="post"><header class="post-top"><span class="post-ring" aria-hidden="true"></span><span class="post-who">@elena.studies<svg viewBox="0 0 24 24" class="vtick" aria-hidden="true"><path d="m12 2 2.4 2.1 3.2-.4 1 3 2.9 1.3-1 3.1 1 3.1-2.9 1.3-1 3-3.2-.4L12 22l-2.4-2.1-3.2.4-1-3L2.5 16l1-3.1-1-3.1L5.4 8.5l1-3 3.2.4Z" fill="currentColor"/><path d="m8.6 12.2 2.4 2.4 4.6-4.8" fill="none" stroke="var(--night-2)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span></header><span class="post-art" style="--a:color-mix(in srgb,var(--g4) 52%,var(--g1));--b:var(--night-2)" aria-hidden="true"></span><div class="post-foot"><p class="post-cap">14 hours of revision. Day 61 of 100.</p><p class="post-num"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7.5-4.6-7.5-9.4A4.3 4.3 0 0 1 12 7.8a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20Z" fill="currentColor"/></svg>203K</p></div></article><article class="post"><header class="post-top"><span class="post-ring" aria-hidden="true"></span><span class="post-who">@firstclass.only<svg viewBox="0 0 24 24" class="vtick" aria-hidden="true"><path d="m12 2 2.4 2.1 3.2-.4 1 3 2.9 1.3-1 3.1 1 3.1-2.9 1.3-1 3-3.2-.4L12 22l-2.4-2.1-3.2.4-1-3L2.5 16l1-3.1-1-3.1L5.4 8.5l1-3 3.2.4Z" fill="currentColor"/><path d="m8.6 12.2 2.4 2.4 4.6-4.8" fill="none" stroke="var(--night-2)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="post-ad">Sponsored</span></header><span class="post-art" style="--a:color-mix(in srgb,var(--warm) 26%,var(--night));--b:var(--night)" aria-hidden="true"></span><div class="post-foot"><p class="post-cap">Bought it at 22. Keep going.</p><p class="post-num"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7.5-4.6-7.5-9.4A4.3 4.3 0 0 1 12 7.8a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20Z" fill="currentColor"/></svg>1.8M</p></div></article><article class="post"><header class="post-top"><span class="post-ring" aria-hidden="true"></span><span class="post-who">@summer.unreal<svg viewBox="0 0 24 24" class="vtick" aria-hidden="true"><path d="m12 2 2.4 2.1 3.2-.4 1 3 2.9 1.3-1 3.1 1 3.1-2.9 1.3-1 3-3.2-.4L12 22l-2.4-2.1-3.2.4-1-3L2.5 16l1-3.1-1-3.1L5.4 8.5l1-3 3.2.4Z" fill="currentColor"/><path d="m8.6 12.2 2.4 2.4 4.6-4.8" fill="none" stroke="var(--night-2)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span></header><span class="post-art" style="--a:color-mix(in srgb,var(--dusk) 40%,var(--g2));--b:var(--night)" aria-hidden="true"></span><div class="post-foot"><p class="post-cap">Third country this month. Remote life hits different.</p><p class="post-num"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7.5-4.6-7.5-9.4A4.3 4.3 0 0 1 12 7.8a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20Z" fill="currentColor"/></svg>934K</p></div></article><article class="post"><header class="post-top"><span class="post-ring" aria-hidden="true"></span><span class="post-who">@ella.andjames<svg viewBox="0 0 24 24" class="vtick" aria-hidden="true"><path d="m12 2 2.4 2.1 3.2-.4 1 3 2.9 1.3-1 3.1 1 3.1-2.9 1.3-1 3-3.2-.4L12 22l-2.4-2.1-3.2.4-1-3L2.5 16l1-3.1-1-3.1L5.4 8.5l1-3 3.2.4Z" fill="currentColor"/><path d="m8.6 12.2 2.4 2.4 4.6-4.8" fill="none" stroke="var(--night-2)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span></header><span class="post-art" style="--a:color-mix(in srgb,var(--warm) 22%,var(--night));--b:var(--night-3)" aria-hidden="true"></span><div class="post-foot"><p class="post-cap">He proposed. 23, and everything is finally falling into place.</p><p class="post-num"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7.5-4.6-7.5-9.4A4.3 4.3 0 0 1 12 7.8a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20Z" fill="currentColor"/></svg>2.4M</p></div></article><article class="post"><header class="post-top"><span class="post-ring" aria-hidden="true"></span><span class="post-who">@minuteman.hustle<svg viewBox="0 0 24 24" class="vtick" aria-hidden="true"><path d="m12 2 2.4 2.1 3.2-.4 1 3 2.9 1.3-1 3.1 1 3.1-2.9 1.3-1 3-3.2-.4L12 22l-2.4-2.1-3.2.4-1-3L2.5 16l1-3.1-1-3.1L5.4 8.5l1-3 3.2.4Z" fill="currentColor"/><path d="m8.6 12.2 2.4 2.4 4.6-4.8" fill="none" stroke="var(--night-2)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span></header><span class="post-art" style="--a:color-mix(in srgb,var(--g3) 64%,var(--night-3));--b:var(--g1)" aria-hidden="true"></span><div class="post-foot"><p class="post-cap">If you are not up at 5, you do not want it.</p><p class="post-num"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7.5-4.6-7.5-9.4A4.3 4.3 0 0 1 12 7.8a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20Z" fill="currentColor"/></svg>627K</p></div></article><article class="post"><header class="post-top"><span class="post-ring" aria-hidden="true"></span><span class="post-who">@that.girl.era<svg viewBox="0 0 24 24" class="vtick" aria-hidden="true"><path d="m12 2 2.4 2.1 3.2-.4 1 3 2.9 1.3-1 3.1 1 3.1-2.9 1.3-1 3-3.2-.4L12 22l-2.4-2.1-3.2.4-1-3L2.5 16l1-3.1-1-3.1L5.4 8.5l1-3 3.2.4Z" fill="currentColor"/><path d="m8.6 12.2 2.4 2.4 4.6-4.8" fill="none" stroke="var(--night-2)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span></header><span class="post-art" style="--a:color-mix(in srgb,var(--g3) 66%,var(--moon));--b:var(--g1)" aria-hidden="true"></span><div class="post-foot"><p class="post-cap">5am. Pilates, matcha, journal, before anyone else is awake.</p><p class="post-num"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7.5-4.6-7.5-9.4A4.3 4.3 0 0 1 12 7.8a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20Z" fill="currentColor"/></svg>668K</p></div></article><article class="post"><header class="post-top"><span class="post-ring" aria-hidden="true"></span><span class="post-who">@elena.studies<svg viewBox="0 0 24 24" class="vtick" aria-hidden="true"><path d="m12 2 2.4 2.1 3.2-.4 1 3 2.9 1.3-1 3.1 1 3.1-2.9 1.3-1 3-3.2-.4L12 22l-2.4-2.1-3.2.4-1-3L2.5 16l1-3.1-1-3.1L5.4 8.5l1-3 3.2.4Z" fill="currentColor"/><path d="m8.6 12.2 2.4 2.4 4.6-4.8" fill="none" stroke="var(--night-2)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span></header><span class="post-art" style="--a:color-mix(in srgb,var(--g4) 52%,var(--g1));--b:var(--night-2)" aria-hidden="true"></span><div class="post-foot"><p class="post-cap">14 hours of revision. Day 61 of 100.</p><p class="post-num"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7.5-4.6-7.5-9.4A4.3 4.3 0 0 1 12 7.8a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20Z" fill="currentColor"/></svg>203K</p></div></article><article class="post"><header class="post-top"><span class="post-ring" aria-hidden="true"></span><span class="post-who">@firstclass.only<svg viewBox="0 0 24 24" class="vtick" aria-hidden="true"><path d="m12 2 2.4 2.1 3.2-.4 1 3 2.9 1.3-1 3.1 1 3.1-2.9 1.3-1 3-3.2-.4L12 22l-2.4-2.1-3.2.4-1-3L2.5 16l1-3.1-1-3.1L5.4 8.5l1-3 3.2.4Z" fill="currentColor"/><path d="m8.6 12.2 2.4 2.4 4.6-4.8" fill="none" stroke="var(--night-2)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="post-ad">Sponsored</span></header><span class="post-art" style="--a:color-mix(in srgb,var(--warm) 26%,var(--night));--b:var(--night)" aria-hidden="true"></span><div class="post-foot"><p class="post-cap">Bought it at 22. Keep going.</p><p class="post-num"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7.5-4.6-7.5-9.4A4.3 4.3 0 0 1 12 7.8a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20Z" fill="currentColor"/></svg>1.8M</p></div></article><article class="post"><header class="post-top"><span class="post-ring" aria-hidden="true"></span><span class="post-who">@summer.unreal<svg viewBox="0 0 24 24" class="vtick" aria-hidden="true"><path d="m12 2 2.4 2.1 3.2-.4 1 3 2.9 1.3-1 3.1 1 3.1-2.9 1.3-1 3-3.2-.4L12 22l-2.4-2.1-3.2.4-1-3L2.5 16l1-3.1-1-3.1L5.4 8.5l1-3 3.2.4Z" fill="currentColor"/><path d="m8.6 12.2 2.4 2.4 4.6-4.8" fill="none" stroke="var(--night-2)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span></header><span class="post-art" style="--a:color-mix(in srgb,var(--dusk) 40%,var(--g2));--b:var(--night)" aria-hidden="true"></span><div class="post-foot"><p class="post-cap">Third country this month. Remote life hits different.</p><p class="post-num"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7.5-4.6-7.5-9.4A4.3 4.3 0 0 1 12 7.8a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20Z" fill="currentColor"/></svg>934K</p></div></article><article class="post"><header class="post-top"><span class="post-ring" aria-hidden="true"></span><span class="post-who">@ella.andjames<svg viewBox="0 0 24 24" class="vtick" aria-hidden="true"><path d="m12 2 2.4 2.1 3.2-.4 1 3 2.9 1.3-1 3.1 1 3.1-2.9 1.3-1 3-3.2-.4L12 22l-2.4-2.1-3.2.4-1-3L2.5 16l1-3.1-1-3.1L5.4 8.5l1-3 3.2.4Z" fill="currentColor"/><path d="m8.6 12.2 2.4 2.4 4.6-4.8" fill="none" stroke="var(--night-2)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span></header><span class="post-art" style="--a:color-mix(in srgb,var(--warm) 22%,var(--night));--b:var(--night-3)" aria-hidden="true"></span><div class="post-foot"><p class="post-cap">He proposed. 23, and everything is finally falling into place.</p><p class="post-num"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7.5-4.6-7.5-9.4A4.3 4.3 0 0 1 12 7.8a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20Z" fill="currentColor"/></svg>2.4M</p></div></article><article class="post"><header class="post-top"><span class="post-ring" aria-hidden="true"></span><span class="post-who">@minuteman.hustle<svg viewBox="0 0 24 24" class="vtick" aria-hidden="true"><path d="m12 2 2.4 2.1 3.2-.4 1 3 2.9 1.3-1 3.1 1 3.1-2.9 1.3-1 3-3.2-.4L12 22l-2.4-2.1-3.2.4-1-3L2.5 16l1-3.1-1-3.1L5.4 8.5l1-3 3.2.4Z" fill="currentColor"/><path d="m8.6 12.2 2.4 2.4 4.6-4.8" fill="none" stroke="var(--night-2)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span></header><span class="post-art" style="--a:color-mix(in srgb,var(--g3) 64%,var(--night-3));--b:var(--g1)" aria-hidden="true"></span><div class="post-foot"><p class="post-cap">If you are not up at 5, you do not want it.</p><p class="post-num"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7.5-4.6-7.5-9.4A4.3 4.3 0 0 1 12 7.8a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20Z" fill="currentColor"/></svg>627K</p></div></article></div></div>
    </div>
  </div>
</section>

<section class="sec night" id="who" data-time="23:58">
  <div class="wrap">
    <div class="who-head">
      <div>
        <p class="eyebrow">Who it is for</p>
        <h2>Beyond is for you if your phone has more say in your plans than you do.</h2>
      </div>
      <p class="who-note">Beyond is a journal that answers you once, the next morning. It is not therapy, not a chatbot, and not another feed.</p>
    </div>
    <div class="who-grid">
      <div><h3>You are always a little behind</h3><p>Not because you are, but because the feed is built so that somebody always is further ahead.</p></div>
      <div><h3>You want to understand yourself, not be diagnosed</h3><p>You are not in crisis. You just have no quiet place to work out what you actually think.</p></div>
      <div><h3>You want a direction that is yours</h3><p>Not the one that trended this month. Something you would still choose with the apps closed.</p></div>
    </div>
  </div>
</section>

<section class="sec night" id="stats" data-time="00:14" style="padding-top:0">
  <div class="wrap">
    <div class="sec-head">
            <h2>We asked 42 students how it feels.</h2>
      <p class="sub">High school and university students across Asia, Europe and North America.</p>
    </div>
    <div class="stat-grid">
      <figure class="stat" data-n="34"><div class="num">80%+</div><div class="dots" aria-hidden="true"></div><figcaption>feel lost about where they're heading</figcaption></figure>
      <figure class="stat" data-n="38"><div class="num">91%</div><div class="dots" aria-hidden="true"></div><figcaption>have things to get off their chest, but no right person to tell</figcaption></figure>
      <figure class="stat" data-n="36"><div class="num">86%</div><div class="dots" aria-hidden="true"></div><figcaption>want advice that fits their life, not generic stress tips</figcaption></figure>
      <figure class="stat" data-n="31"><div class="num">73%</div><div class="dots" aria-hidden="true"></div><figcaption>would use a letter that arrives the next morning, and 18% more are considering it</figcaption></figure>
    </div>
    <p class="foot">Beyond team survey, 2026, n = 42. Each dot is one student. It's a small sample, so our beta will test these findings with more people.</p>
  </div>
</section>

<section class="sec night" id="how" data-time="03:30" style="padding-top:clamp(40px,6vw,80px)">
  <div class="wrap">
    <div class="sec-head">
            <h2>Say it tonight.<br>Understand it tomorrow.</h2>
      <p class="sub">Beyond keeps expressing and reflecting apart. You get to finish a thought before anything answers it.</p>
    </div>
    <ol class="band">
      <li class="b1"><span class="sky-moon" aria-hidden="true"></span><span class="when">23:00, tonight</span><h3>Say it the way it comes.</h3><p>Write or speak for 5–10 minutes. Beyond doesn't reply, interrupt, or ask follow-up questions.</p></li>
      <li class="b2"><span class="sky-stars" aria-hidden="true"></span><span class="when">02:00, overnight</span><h3>Beyond reads between the nights.</h3><p>It reads tonight's entry next to the memories you've let it keep, and finds what keeps coming back.</p></li>
      <li class="b3"><span class="sky-sun" aria-hidden="true"></span><span class="when">07:30, morning</span><h3>A letter, not a chat.</h3><p>Written in the voice you pick: what you said, what keeps returning, and one small step for today.</p></li>
    </ol>
  </div>
</section>

<section class="sec night" id="try" data-time="07:30">
  <div class="wrap">
    <div class="sec-head">
            <h2>Leave it for the night. Read it in the morning.</h2>
      <p class="sub">Edit the entry if you like, then leave it for the night. Switch voices to see how the same night reads from a friend, a mentor, or your future self.</p>
    </div>
    <div class="try-grid bui">
      <div class="try-night">
        <div class="try-top"><span class="try-k">Thu 8 Oct, 23:48</span><span class="try-k">No replies. Just you.</span></div>
        <div class="lantern-wrap" id="lanternWrap" aria-hidden="true"><div class="lantern"></div></div>
        <label for="entryText" class="sr">Tonight's entry</label>
        <textarea class="paper-in" id="entryText" placeholder="What's actually on your mind?"></textarea>
        <p class="warn" id="entryWarn" hidden>Write something first. One sentence is enough.</p>
        <div class="try-foot"><span class="fine" id="wc">The light grows as you write</span><button class="btn" id="seal">Leave it for tonight</button></div>
      </div>

      <div class="try-morning">
        <div class="lvoices" role="tablist" aria-label="Letter voice">
          <button role="tab" aria-selected="true" data-v="friend">Friend</button>
          <button role="tab" aria-selected="false" data-v="mentor">Mentor</button>
          <button role="tab" aria-selected="false" data-v="future">Future you</button>
          <button role="tab" aria-selected="false" data-v="diary">Diary</button>
        </div>
        <article class="letter paper" id="letter" aria-live="polite" style="position:relative">
          <div class="overnight" id="overnight" hidden><p class="t" id="ovClock">23:48</p><p>Reading between the nights…</p></div>
          <div class="letter-meta"><span>Fri 9 Oct</span><span id="letterFrom">From your Friend</span></div>
          <div id="letterBody"></div>
          <div class="ls"><h2 class="ls-label" style="--c:var(--m4)"><b>One small step</b></h2>
            <div class="ls-body">
              <p id="stepText"></p>
              <div class="step-actions" id="stepActions">
                <button class="pri" data-a="try">I'll try it</button>
                <button data-a="skip">Not for me</button>
                <button class="link" data-a="fix">That's not quite right</button>
              </div>
              <p class="step-note" id="stepNote" hidden></p>
              <form class="fix" id="fixForm" hidden>
                <label for="fixText" class="sr">What did Beyond get wrong?</label>
                <textarea id="fixText" placeholder="What did Beyond get wrong?"></textarea>
                <div class="step-actions"><button class="pri" type="submit">Send correction</button><button type="button" id="fixCancel">Cancel</button></div>
              </form>
            </div>
          </div>
          <p class="fine" id="demoNote">Demo letter written for the sample entry. In the app, Beyond writes it from your entry and the memories you allow.</p>
        </article>
      </div>
    </div>
  </div>
</section>      </article>
    </div>
  </div>
</section>

<section class="sec night" id="why" data-time="08:15">
  <div class="wrap">
    <div class="cmp-intro">
      <div style="display:grid;gap:22px"><h2>Less noise.<br>More you.</h2></div>
      <div><p class="sub">Your feed is optimized for attention. Beyond is designed for reflection.</p><p class="sub">Write without interruption. Come back later. See your own patterns instead of everyone else's highlight reel.</p></div>
    </div>
    <div class="cmp">
      <article><h3>AI chatbots</h3><dl><div><dt>Good for</dt><dd>Fast answers to almost anything.</dd></div><div><dt>Falls short</dt><dd>Answers before you've finished thinking. Advice often feels generic, and it forgets you.</dd></div></dl></article>
      <article><h3>Therapy &amp; helplines</h3><dl><div><dt>Good for</dt><dd>Serious mental-health needs. Essential, and Beyond points people there.</dd></div><div><dt>Falls short</dt><dd>Not built for everyday reflection on where your life is going.</dd></div></dl></article>
      <article><h3>AI journaling apps</h3><dl><div><dt>Good for</dt><dd>Guided prompts and AI feedback on entries.</dd></div><div><dt>Falls short</dt><dd>The AI joins the conversation while you're still writing.</dd></div></dl></article>
      <article class="us"><h3>beyond.</h3><dl><div><dt>Built for</dt><dd>Students who don't need therapy or another instant answer, but want to slow down and find their direction.</dd></div><div><dt>What's different</dt><dd>Expression first, reflection later. A letter in the voice you choose, with one small step instead of ten.</dd></div></dl></article>
    </div>
  </div>
</section>

<section class="sec night" id="patterns" data-time="12:40">
  <div class="wrap">
    <div class="sec-head">
      <p class="eyebrow">Monthly review &amp; Life Film</p>
      <h2>Your patterns. Not their highlight reel.</h2>
      <p class="sub">Single letters help you get through a week. Over months, Beyond shows what keeps coming back, what's fading, and who you're turning into.</p>
    </div>
    <div class="pat-ui bui">
      <div id="patSky"></div>
      <div class="qcards" id="patCards"></div>
      <section class="pat-film film-wrap" aria-labelledby="film-h">
        <div class="film-head"><h2 class="h2" id="film-h">Your Life Film</h2><p class="fine">One frame per month, with a line you wrote that month. Nobody else is in it to compare against.</p></div>
        <div class="film" id="patFilm" tabindex="0" aria-label="Life Film frames"></div>
      </section>
    </div>
  </div>
</section>

<section class="sec night" id="memory"  </div>
</section>

<section class="sec night" id="memory" data-time="15:05">
  <div class="wrap mem-grid">
    <div>
      <div style="display:grid;gap:22px"><h2>You decide what Beyond remembers.</h2><p class="sub">Memory is what makes a letter feel like it knows you. It still belongs to you. See everything Beyond keeps, fix what it got wrong, and delete what you don't want used.</p></div>
      <ul class="mem-points">
        <li><b>Every memory shows its source</b><span>Which entries or settings it came from.</span></li>
        <li><b>Edit or forget any line</b><span>Forgotten means gone, not hidden.</span></li>
        <li><b>Pause memory</b><span>For one night or for good. Letters then use tonight's entry only.</span></li>
      </ul>
    </div>
    <div class="mem-card">
      <div class="mem-card-head"><h3>What Beyond remembers</h3><button class="switch" role="switch" aria-checked="true" id="memSwitch"><span id="memLabel">Memory on</span><span class="track"></span></button></div>
      <p class="paused-msg" id="pausedMsg" hidden>Memory is paused. Tonight's letter will only use tonight's entry.</p>
      <div class="bui"><ul class="mem-list" id="memList"></ul></div>
      <div class="toast" id="toast" hidden><span id="toastText">Forgotten.</span><button id="undo">Undo</button></div>
      <p class="demo-note">Sample memories. Try editing or forgetting one.</p>
    </div>
  </div>
</section>

<section class="sec night" id="app" data-time="18:20">
  <div class="wrap app-grid">
    <div class="app-copy">
            <h2>Beyond, in your pocket.</h2>
      <p class="sub">Built for the last ten minutes of your day. One dark, quiet screen at night. One letter in the morning. No feed, no likes, no streaks to protect.</p>
      <div class="app-ctas"><a class="btn btn-dark" href="/app">Open Beyond</a></div>
      <p class="demo-note">Screens from the running app, with Kit’s fictional sample journal rather than anyone’s real nights.</p>
    </div>
    <div>
      <div class="phones">
        <figure class="mock"><img src="/shots/tonight.webp" width="468" height="1013"
          alt="Tonight in the Beyond app: the prompt reads What's on your mind tonight?, with a lit orb above the writing surface and the note The light grows as you write."></figure>
        <figure class="mock mid"><img src="/shots/letter.webp" width="468" height="1013"
          alt="A morning letter on paper, headed You don't need the whole map yet, with its Recap and Insight sections."></figure>
        <figure class="mock"><img src="/shots/patterns.webp" width="468" height="1013"
          alt="Patterns in the Beyond app: six nights plotted as stars, with the ones about helping others joined into a constellation."></figure>
      </div>
      <p class="cap">Tonight, the morning letter, and Patterns</p>
    </div>
  </div>
</section>

<section class="sec night" id="safety" data-time="20:40">
  <div class="wrap">
    <div class="sec-head">
      <p class="eyebrow">Privacy &amp; limits</p>
      <h2>Safe enough to be honest.</h2>
      <p class="sub">People only write honestly when they trust where the words go. So Beyond is clear about what it keeps, what it sends, and what it isn't.</p>
    </div>
    <div class="safe-grid">
      <article><h3>Your private account</h3><p>Your nights, letters, memories, notes and settings are stored in your Beyond account, readable only with your sign-in. Nothing you write is kept in browser storage, and closing the tab signs you out on shared devices. This is not end-to-end encryption: Beyond’s servers can read what they store in order to write your letters.</p></article>
      <article><h3>Sealing is the permission</h3><p>A night goes to the letter writer only when you seal it. Just that night, the voice and language you chose, memories you can see (unless paused) and the headlines of up to four earlier letters you kept. Never your email, name or account.</p></article>
      <article><h3>Memory you can see</h3><p>A letter may remember at most two small things you wrote, each linked to its night. Edit or forget any of them; a forgotten memory is never learned again. Keep a night out of Patterns and nothing learned from it is used.</p></article>
      <article><h3>Control what stays</h3><p>Download a copy, delete your journal, or delete your account after confirming it’s you. Deletion removes letters, notes and memories too. Copies you downloaded, and the AI provider’s own short-lived records, are outside what deletion can reach.</p></article>
      <article><h3>Not therapy</h3><p>Beyond doesn’t diagnose or treat anything. A limited keyword check shows support contacts while you write, and a letter that senses risk points you to people, but both can miss things. A morning letter is not emergency help.</p></article>
    </div>
    <div class="crisis">
      <p>If you're struggling right now, please don't wait for a letter. In Hong Kong you can reach someone tonight.</p>
      <div class="lines">
        <div class="line"><b>18111</b><span>Mental Health Support Hotline, 24 hours</span></div>
        <div class="line"><b>999</b><span>Emergency</span></div>
      </div>
    </div>
  </div>
</section>

<section class="sec night" id="schools" data-time="21:30" style="padding-top:0">
  <div class="wrap">
    <div class="sec-head">
            <h2>Beyond for schools and teams.</h2>
      <p class="sub">Universities, schools and employers can offer Beyond to the people they look after. Each person gets their own private space.</p>
    </div>
    <div class="school-grid">
      <article><span class="big">Schools</span><h3>Universities &amp; high schools</h3><p>A daily reflection habit for students facing big choices about subjects, careers and who they want to be.</p></article>
      <article><span class="big">Teams</span><h3>Employers</h3><p>A quiet place for staff to process their week and set one realistic next step, away from performance reviews.</p></article>
      <article><span class="big">Private</span><h3>Entries stay personal</h3><p>Institutions pay for access. They never see anyone's entries, letters or memories.</p></article>
    </div>
  </div>
</section>

<section class="sec night join" id="join" data-time="22:47">
  <div class="wrap">
    <p class="eyebrow">Beta</p>
    <h2 style="margin-top:22px">Tonight, write without an audience.</h2>
    <p class="sub">We're opening a small beta for students. Tell us where to reach you, and help shape what Beyond becomes. Or <a href="/app" style="color:var(--paper)">open Beyond</a> right now.</p>
    <form id="joinForm" novalidate>
      <label for="email" class="sr">Email</label>
      <input id="email" type="email" placeholder="you@university.edu" autocomplete="email">
      <button class="btn btn-light" type="submit">Join the beta</button>
    </form>
    <p class="msg" id="joinMsg" aria-live="polite"></p>
  </div>
</section>

<footer>
  <div class="foot-in">
    <span class="logo">beyond.</span>
    <span>Made by Team Beyond for the HK Inter-University GenAI Hackathon for SDGs 2026 · SDG 3: Good health and well-being</span>
  </div>
</footer>`;
