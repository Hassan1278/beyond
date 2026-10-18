/**
 * Simplified Chinese for the journal app's own wording, written for Mandarin
 * readers: natural phrasing over word-for-word. Keys are the English exactly as
 * the page shows it. Letters, quotes and anything a person wrote are never here.
 */

const MON: Record<string, number> = {
  Jan: 1,
  Feb: 2,
  Mar: 3,
  Apr: 4,
  May: 5,
  Jun: 6,
  Jul: 7,
  Aug: 8,
  Sep: 9,
  Oct: 10,
  Nov: 11,
  Dec: 12,
};
const MONTH: Record<string, number> = {
  January: 1,
  February: 2,
  March: 3,
  April: 4,
  May: 5,
  June: 6,
  July: 7,
  August: 8,
  September: 9,
  October: 10,
  November: 11,
  December: 12,
};
const WD: Record<string, string> = {
  Sun: '周日',
  Mon: '周一',
  Tue: '周二',
  Wed: '周三',
  Thu: '周四',
  Fri: '周五',
  Sat: '周六',
};

/** "Sat 17 Oct" → "10月17日 周六" */
const day = (wd: string, d: string, m: string): string => `${MON[m]}月${d}日 ${WD[wd]}`;
const DAY =
  '(Sun|Mon|Tue|Wed|Thu|Fri|Sat) (\\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)';
const MO = '(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)';
const MONTHS =
  '(January|February|March|April|May|June|July|August|September|October|November|December)';
const mo = (m: string): string => `${MON[m] ?? MONTH[m]}月`;

const THEMES: Record<string, string> = {
  'study pressure': '学业压力',
  'internships & jobs': '实习与工作',
  'your business idea': '你的创业想法',
  'building things': '动手做东西',
  'making art': '艺术创作',
  curiosity: '好奇心',
  friends: '朋友',
  family: '家人',
  'helping others': '帮助他人',
  rest: '休息',
  'your body': '身体',
  "not knowing what's next": '不知道下一步',
  'comparing yourself': '和别人比较',
  'feeling alone': '孤独',
  'getting things done': '把事情做完',
  money: '钱',
  'being outdoors': '户外',
  travel: '旅行',
  'an ordinary day': '平常的一天',
  'an ordinary month': '平常的一个月',
};
const theme = (t: string): string => THEMES[t] ?? THEMES[t.toLowerCase()] ?? t;

const DIRECTIONS: Record<string, string> = {
  'Young Entrepreneur': '年轻创业者',
  'Maker & Builder': '创客',
  'Creative Explorer': '创意探索者',
  'Curious Learner': '求知者',
  'Community Builder': '社群建设者',
  'World Explorer': '世界探索者',
};
const BLURBS: Record<string, string> = {
  'turning ideas into something people can use or buy': '把想法变成别人能用、愿意买的东西',
  'building things like apps, sites and prototypes': '做应用、网站和原型这类东西',
  'making things for the joy of making them': '为了创作的乐趣而创作',
  'following questions because they interest you': '因为感兴趣，就一路追问下去',
  'bringing people together and showing up for others': '把人聚在一起，在别人需要时出现',
  'getting outside and seeing new places': '走出去，看看新的地方',
};
const dir = (n: string): string => DIRECTIONS[n] ?? n;

const VOICES: Record<string, string> = {
  Friend: '朋友',
  Mentor: '导师',
  'Future you': '未来的你',
  'Plain diary': '纯日记',
};
const KINDS: Record<string, string> = {
  rest: '休息',
  connection: '联结',
  exploration: '探索',
  practical: '行动',
  reflection: '反思',
  focus: '专注',
  movement: '活动身体',
};

const SUPPORT_NAMES: Record<string, string> = {
  'Emergency services · 緊急服務': '紧急服务',
  'Mental Health Support Hotline · 精神健康支援熱線': '精神健康支援热线',
  'The Samaritans Hong Kong · 撒瑪利亞會': '香港撒玛利亚会',
  'Suicide Prevention Services · 生命熱線': '生命热线',
  'Open Up · Open 噏 (online text support)': 'Open噏（网上文字支援）',
};
const SUPPORT_NOTES: Record<string, string> = {
  'If you or someone else is in immediate danger.': '如果你或身边的人正面临紧急危险。',
  '24 hours · Cantonese, English': '24 小时 · 粤语、英语',
  '24 hours · multilingual': '24 小时 · 多种语言',
  '24 hours · Cantonese': '24 小时 · 粤语',
  '24 hours · for young people': '24 小时 · 面向年轻人',
};

const PHRASES: Record<string, string> = {
  /* ---- frame ---- */
  Beyond: 'Beyond',
  Main: '主导航',
  Identity: '自我',
  Journal: '日记',
  Letters: '来信',
  Patterns: '规律',
  Settings: '设置',
  'Unread letter': '未读来信',
  'Beyond, Identity': 'Beyond，回到自我',
  Close: '关闭',
  Back: '返回',
  New: '新',
  sample: '示例',
  demo: '演示',
  '· sample': '· 示例',
  ', sample': '，示例',
  ', demo': '，演示',
  ', demo letter': '，演示信',
  ', Kit’s sample': '，Kit 的示例',

  /* ---- journal (tonight) ---- */
  "What's on your mind tonight?": '今晚在想些什么？',
  'What took most of your energy today?': '今天什么最耗你的精力？',
  'Who did you feel close to today, even for a minute?': '今天有谁让你觉得亲近，哪怕只有一分钟？',
  '今日有咩想講？': '今天有什么想说的？',
  'What felt heavier than it should have?': '有什么事，比想象中更沉重？',
  'What are you unsure about right now?': '现在有什么让你拿不准？',
  'What made you smile, even a little?': '有什么让你笑了，哪怕只是一下？',
  'Just say it. Nothing replies.': '说出来就好，不会有人回复。',
  'Start with how today felt.': '先说说今天的感觉。',
  '今日發生咗咩？慢慢講。': '今天发生了什么？慢慢说。',
  'What’s still on your mind?': '还有什么放不下？',
  'Say it the way you’d say it to yourself.': '就像对自己说话那样说出来。',
  "Tonight's entry": '今晚的日记',
  'Start anywhere': '想到哪写到哪',
  'Talk instead of typing': '用说的，不用打字',
  'Stop talking': '停止说话',
  'Seal tonight': '封存今晚',
  'I’m speaking': '我在说',
  'Turning your voice into words…': '正在把你的声音转成文字……',
  'Allow microphone?': '允许使用麦克风？',
  "You don't have to wait for the morning.": '你不必等到早上。',
  "Beyond isn't watched by a person and can't help in an emergency. If you're struggling or in danger, people can help right now, free and confidential.":
    'Beyond 没有专人看守，无法在紧急情况下帮你。如果你正感到难熬或身处危险，现在就有人可以帮你，免费且保密。',
  'See who to talk to': '看看可以找谁聊',

  /* ---- sealing ---- */
  'Sealed. Nothing replies tonight.': '已封存。今晚不会有回复。',
  'Sealed for the night.': '今晚已封存。',
  'Arrives at': '送达时间',
  'Claude is writing quietly': 'Claude 正在安静地写信',
  'Preparing your sample letter': '正在准备你的示例信',
  'Sealed and waiting for the letter writer': '已封存，等待写信服务开启',
  "The letter couldn't be written yet": '这封信暂时还写不出来',
  'Try again': '再试一次',
  'Skip to morning': '跳到早上',
  "Demo: Skip to morning shows the letter now. It doesn't change your device's clock.":
    '演示：“跳到早上”会立即显示这封信，不会更改你设备上的时间。',
  'Read it now': '现在就读',
  'Can’t wait? That’s fine. You can turn this off in Settings.':
    '等不及了？没关系。你可以在设置里关掉这个选项。',
  'The night passes…': '夜色渐渐过去……',
  'Good morning. Your letter is here.': '早上好，你的信到了。',
  'Open the letter': '拆开这封信',
  'Opening your letter…': '正在拆信……',
  'Claude is finishing your letter…': 'Claude 正在写完你的信……',
  'Claude is still writing your letter…': 'Claude 还在写你的信……',
  'Finishing your sample letter…': '正在完成你的示例信……',
  'Still writing. This can take up to a minute.': '还在写，最多需要一分钟。',
  'Still being written. It will be here soon.': '还在写，很快就到。',
  "Your device's clock doesn't change.": '你设备上的时间不会改变。',
  'Your letter is sealed and waiting for the letter writer.':
    '你的信已封存，正在等待写信服务开启。',
  'Letters will wait for the morning.': '信会等到早上再来。',
  'Your words are below. Read them over, then seal.': '你写下的话在下面。再读一遍，然后封存。',
  'Your words': '你写下的话',
  'Write it again': '重新写一遍',

  /* ---- morning and colours ---- */
  'Good morning.': '早上好。',
  'Something to think about today': '今日想一想',
  'One small step': '一小步',
  'Mark as done': '标记为完成',
  'Marked “Not for me”.': '已标记为“不适合我”。',
  'Gold seal': '金印',
  'Gold seal earned.': '已获得金印。',
  'Not done yet': '还没完成',
  'Your words are saved. Today’s letters are used up, so Skip to morning will show a demo letter.':
    '你的文字已保存。今天的信件次数已用完，所以“跳到早上”会显示一封演示信。',
  'Your words are saved. Today’s letters are used up, so this night’s letter has to wait.':
    '你的文字已保存。今天的信件次数已用完，这一晚的信需要再等等。',
  'Beyond’s letter writer isn’t switched on yet, so this letter can’t be written. It’s sealed and safe.':
    'Beyond 的写信服务还没有开启，所以这封信暂时写不出来。它已经封存好，很安全。',
  Sealed: '已封存',
  'A letter arrived for you': '你有一封信到了',
  'Open it': '拆开看看',
  Later: '稍后',
  Colours: '配色',
  'Colour theme': '配色方案',
  Midnight: '午夜',
  Candle: '烛光',
  Ink: '墨',
  'Deep navy, a soft periwinkle light': '深海军蓝，透着柔和的淡紫蓝光',
  'Warm charcoal and amber, the original': '温暖的炭黑与琥珀色，最初的配色',
  'Black and white, dark': '黑白 · 深色',
  'Only changes how Beyond looks on this device.': '只改变 Beyond 在这台设备上的外观。',

  /* ---- welcome (first sign-in): wording lives in welcome.ts ---- */
  'How Beyond works': 'Beyond 怎么用',
  'Whatever’s on your mind, whenever it hits.': '心里想到什么，就在那一刻写下来。',
  'Receive a personalised letter and reflection the next morning.':
    '第二天早上，收到一封为你而写的信和反思。',
  'Look back and see yourself grow.': '回头看看，看见自己的成长。',
  'Reflect on your journals and patterns.': '回顾你的日记和规律。',
  'Want to have something to look back on': '想留下一些以后可以回头看的东西',
  'What should your letters call you?': '你希望信里怎么称呼你？',
  'Your name or a nickname (optional)': '你的名字或昵称（可不填）',
  'You can switch anytime in Settings.': '随时可以在设置里更改。',
  'What your letters call you': '信里怎么称呼你',
  'Beyond adds this to your letters itself. The letter writer never sees it.':
    'Beyond 会自己把它加进信里，写信服务永远看不到它。',
  'Your letters will use that name.': '以后的信会用这个称呼。',
  'Your letters won’t use a name.': '以后的信不会用称呼。',
  'Journal and write freely, anytime.': '想写就写，随时都可以。',
  'Whatever’s on your mind, whenever it hits. Nothing interrupts you.':
    '心里想到什么，就在那一刻写下来。没有任何东西会打扰你。',
  'Wake up to a letter.': '醒来就有一封信。',
  'Beyond reads your day and writes back once, the next morning.':
    'Beyond 会读完你的一天，在第二天早上回一封信。',
  'Look back, reflect and see yourself grow.': '回头看看，静下来想想，看见自己的成长。',
  'Your letters and patterns stay with you, so you can see where you’re heading.':
    '你的信和规律会一直留着，让你看清自己正往哪里走。',
  'What brings you here?': '是什么让你来到这里？',
  'Choose any that fit.': '符合的都可以选。',
  'Figuring out what I actually want': '想弄清楚自己真正想要什么',
  'Too much on my mind': '心里装了太多事',
  'Feeling behind everyone else': '总觉得自己落后于别人',
  'Just want somewhere to write': '只是想找个地方写写',
  'Something else…': '其他……',
  'Something else': '其他',
  'Tell us in your own words': '用你自己的话告诉我们',
  'Who writes back each morning?': '每天早上，谁来给你回信？',
  'Just the notes': '只要摘要',
  'A plain summary, no voice.': '简单的摘要，不带语气。',
  'Only the tone changes. You can switch anytime in Settings.':
    '只有口吻会不同，随时可以在设置里切换。',
  'What you write stays yours.': '你写下的，始终属于你。',
  'We value your privacy': '我们重视你的隐私',
  'Private to your account.': '只属于你的账户。',
  'Only you can open your journal. The AI sees a night only when you seal it or speak it, to write your letter.':
    '只有你能打开你的日记。只有在你封存或说出一个晚上时，AI 才会看到它，用来写你的信。',
  'Nothing leaves until you seal it.': '封存之前，什么都不会送出去。',
  'Only that night is used to write your letter. Never your name or email.':
    '写信只会用到那一晚的内容，绝不会用到你的名字或邮箱。',
  'You decide what Beyond remembers.': 'Beyond 记住什么，由你决定。',
  'See, edit, or forget anything, anytime.': '随时查看、编辑或忘记任何内容。',
  'Delete everything, anytime.': '随时删除一切。',
  'Your journal, letters and memories are removed from Beyond right away.':
    '你的日记、信和记忆会立即从 Beyond 删除。',
  'Beyond is a journal, not a crisis service. If you ever need someone right now, help is one tap away in Settings.':
    'Beyond 是一本日记，不是危机支援服务。如果你需要马上找人聊聊，在设置里点一下就能找到帮助。',
  Next: '下一步',
  'I’m ready': '我准备好了',
  'Welcome progress': '欢迎进度',

  /* ---- welcome and sign in ---- */
  'Beyond, a journal that writes back in the morning': 'Beyond，一本会在早上给你回信的日记',
  'Write tonight. Nothing replies. A letter arrives in the morning.':
    '今晚写下来。不会有人回复。早上会收到一封信。',
  'Write or just talk about whatever is on your mind. No feed, no likes, no reply.':
    '心里想什么，就写下来或说出来。没有信息流，没有点赞，也没有回复。',
  Overnight: '夜里',
  "It's sealed. Claude reads it next to your earlier nights.":
    '它会被封存。Claude 会对照你之前的夜晚来读它。',
  Morning: '早上',
  'A short letter, and three small to-dos you can tick off.': '一封短信，还有三件可以勾掉的小事。',
  'Start my journal': '开始写日记',
  'You’re in': '你现在处于',
  'Demo mode': '演示模式',
  ': Kit’s fictional letters are shown next to yours. To use Beyond just for yourself, switch to Normal mode in Settings.':
    '：Kit 的虚构来信会和你的信放在一起。如果只想自己用，请到设置里切换到普通模式。',
  ': after signing in you’ll see Kit’s fictional letters next to yours. To use Beyond just for yourself, switch to Normal mode in Settings.':
    '：登录后，你会看到 Kit 的虚构来信和你的信放在一起。如果只想自己用，请到设置里切换到普通模式。',
  'Letters are written by Claude. Your journal is saved to your Beyond account, private to you.':
    '信由 Claude 撰写。你的日记保存在你的 Beyond 账户里，只有你能看到。',
  'One choice before tonight.': '开始之前，先做一个选择。',
  'Who should write your morning letters?': '你希望谁来写你的晨信？',
  'Letter voice': '写信的语气',
  'The voice changes the tone only. Every letter quotes your exact words and never invents anything. You can change this later.':
    '语气只改变口吻。每封信都会原样引用你写下的话，绝不编造。之后也可以更改。',
  'Start writing': '开始写',
  'Write tonight. A letter by morning.': '今晚写下来，早上收到信。',
  Email: '邮箱',
  Password: '密码',
  'Your password': '你的密码',
  'Password (8+ characters)': '密码（至少 8 个字符）',
  'Sign in': '登录',
  'Continue with Google': '使用 Google 继续',
  'Use Google': '使用 Google',
  'Forgot password?': '忘记密码？',
  'New here? Create an account': '第一次来？创建账户',
  'Create account': '创建账户',
  'Already have an account? Sign in': '已有账户？登录',
  'Start your journal.': '开始你的日记。',
  'Reset your password.': '重置你的密码。',
  'Send reset link': '发送重置链接',
  'Back to sign in': '返回登录',
  'Choose a new password.': '设置一个新密码。',
  'New password': '新密码',
  'New password (8+ characters)': '新密码（至少 8 个字符）',
  'Save password': '保存密码',
  'Check your email.': '请查看你的邮箱。',
  'We sent you a link to confirm your email. Open it on this device to start your journal.':
    '我们给你发了一封确认邮件。请在这台设备上打开链接，开始你的日记。',
  'If that email has a Beyond account, a reset link is on its way. Open it on this device.':
    '如果这个邮箱注册过 Beyond，重置链接已经发出。请在这台设备上打开。',
  'Sign in with your new password.': '请用新密码登录。',
  'Your new password is saved.': '新密码已保存。',
  'That email and password don’t match. Try again, or reset your password.':
    '邮箱和密码不匹配。请再试一次，或重置密码。',
  'That password didn’t work.': '密码不对。',
  'Use at least 8 characters for your password.': '密码至少需要 8 个字符。',
  'That didn’t work. Check the details and try again.': '没有成功。请检查信息后再试。',
  'That didn’t work. Check your connection and try again.': '没有成功。请检查网络后再试。',
  'Google sign-in isn’t available right now.': '现在无法使用 Google 登录。',
  'Please sign in again.': '请重新登录。',
  'You were signed out. Sign in again to continue.': '你已退出登录。请重新登录以继续。',
  'Beyond couldn’t load your journal. Check your connection and try again.':
    'Beyond 无法载入你的日记。请检查网络后再试。',
  'This copy of Beyond isn’t connected to its backend yet.': '这个 Beyond 还没有连接到后台服务。',
  'Your journal is private to your account. Nothing you write is kept in this browser.':
    '你的日记只属于你的账户。你写的内容不会保存在这个浏览器里。',
  'Need help?': '需要帮助？',

  /* ---- letters ---- */
  'All letters': '全部来信',
  'Latest letter': '最新来信',
  'New letter': '新来信',
  'Your morning letters collect here.': '你的晨信都收在这里。',
  'Your letters will collect here, month by month.': '你的信会按月份收在这里。',
  'No letters yet. Write tonight and the first one arrives tomorrow morning.':
    '还没有信。今晚写一写，明天早上就会收到第一封。',
  'No letters.': '没有信。',
  'Search your letters': '搜索你的信',
  'Search titles, summaries, your words and to-dos': '搜索标题、摘要、你写的话和小事',
  'Search titles, summaries, the words you wrote and your to-dos, in any language.':
    '可以搜索标题、摘要、你写下的话和小事，任何语言都行。',
  'Gold seal only': '只看金印',
  'Nothing matches.': '没有找到匹配的信。',
  'Try fewer words, another spelling, or': '试试少用几个词、换个写法，或者',
  'clear the search and filters': '清除搜索和筛选',
  'with these filters': '（在当前筛选下）',
  Copy: '复制',
  "This letter isn't here anymore.": '这封信已经不在了。',
  'Back to Journal': '回到日记',
  'Open Journal': '打开日记',
  Recap: '总结',
  Insight: '分析',
  Challenge: '问题',
  'Try this': '改善',
  Encourage: '鼓励',
  Why: '原因',
  "Today's 3 to-dos": '今天的三件小事',
  'All done. Gold seal earned.': '全部完成，获得金印。',
  'Your words from that night': '那晚你写下的话',
  'Beyond will remember': 'Beyond 会记住',
  'See, edit or forget': '查看、编辑或忘记',
  'Keep this night out of Growth': '不把这一晚计入成长',
  'Show where you wrote this': '显示你在哪里写下这句话',
  "Please don't carry this alone.": '请不要一个人扛着。',
  "Beyond isn't watched by a person. If you're struggling, people can help right now.":
    'Beyond 没有专人看守。如果你正感到难熬，现在就有人可以帮你。',
  'A plain template letter. No AI was available when it was written.':
    '这是一封普通的模板信。写信时没有可用的 AI。',
  'Demo mode: a pre-written sample letter, matched to what you wrote and quoting your own words. Nothing was sent to an AI or saved to your account.':
    '演示模式：一封预先写好的示例信，按你写的内容挑选，并引用你自己的话。没有发送给 AI，也没有保存到你的账户。',
  'Kit’s sample letter, pre-written for the demo. Kit isn’t a real person.':
    'Kit 的示例信，为演示预先写好。Kit 不是真实的人。',
  'Kept out of Growth. The letter stays here.': '已不计入成长。这封信还会留在这里。',
  'This night is back in Growth.': '这一晚已重新计入成长。',
  Done: '完成',
  'To-do': '小事',
  'All optional. “Not for me” tells future letters to suggest something different.':
    '都是可选的。选择“不适合我”，以后的信就会换个建议。',
  'Not for me': '不适合我',
  'Small steps, actually taken. This letter now has a gold seal.':
    '一小步一小步，真的做到了。这封信获得了金印。',
  'This letter has a gold seal.': '这封信已获得金印。',
  Completed: '已完成',
  'All done.': '全部完成。',
  'Read the letter': '读信',
  Summary: '摘要',
  'Bring it back': '恢复这件',
  'Not written yet.': '还没写。',
  'A short note that quotes only your own words.': '一段只引用你原话的短文。',
  'You told Beyond, sample': '你告诉 Beyond 的，示例',
  'Beyond will remember that.': 'Beyond 会记住这一点。',

  /* ---- identity ---- */
  'Your directions': '你的方向',
  'All directions': '全部方向',
  'A possibility': '一种可能',
  'Confirmed by you': '你已确认',
  'This fits me': '这很像我',
  'Remove from my map': '从我的星图中移除',
  'When it showed up': '出现的时间',
  Confirmed: '已确认',
  Suggested: '建议',
  confirmed: '已确认',
  suggested: '建议',
  you: '你',
  Restore: '恢复',
  'Nothing yet.': '暂时还没有。',
  'Write tonight': '今晚写一写',
  'You are at the centre. Larger circles have more nights behind them, and brighter threads mean a stronger pull. Select a direction to see its letters circle it.':
    '你在中心。圆越大，背后的夜晚越多；光线越亮，牵引越强。点一个方向，就能看到相关的信环绕着它。',
  'A direction appears once kept letters from at least three different nights point to it.':
    '当至少三个不同夜晚的信都指向同一处时，就会出现一个方向。',
  'Suggested only when kept letters from at least three different nights point to it. Private letters are never used.':
    '只有至少三个不同夜晚的信都指向它时才会建议。不计入规律的信从不使用。',
  'No kept letters support this right now.': '目前没有信支持这个方向。',
  'Removed from your map.': '已从你的星图中移除。',
  'Restored to suggestions.': '已恢复为建议。',
  'Dismissed. It won’t be suggested again unless you restore it.':
    '已忽略。除非你恢复，否则不会再建议。',

  /* ---- patterns ---- */
  'Your patterns, not their highlight reel.': '你自己的规律，不是别人的高光时刻。',
  'Patterns views': '规律视图',
  Month: '月度',
  Year: '年度',
  'Previous month': '上个月',
  'Next month': '下个月',
  'What took up your month': '这个月你在忙什么',
  'What took up this month, what changed, and what you did.':
    '这个月占据你心思的事、发生的变化，以及你做过的事。',
  'What you did': '你做了什么',
  'Still on your mind': '仍在心头',
  'No open questions in this month’s letters.': '这个月的信里，没有悬而未决的问题。',
  'Nothing ticked off this month. That’s fine; every to-do is optional.':
    '这个月没有勾掉小事。没关系，每件小事都是可选的。',
  'Mostly ordinary days.': '大多是平常的日子。',
  'No kept letters in this month yet.': '这个月还没有信。',
  "Counted in nights. “Less often” doesn't mean it's solved.":
    '按夜晚计算。“更少出现”不代表问题已经解决。',
  'less often': '更少出现',
  'more often': '更常出现',
  'heavier night': '沉重的夜晚',
  'lighter night': '轻松的夜晚',
  'A note on your year so far': '写给你今年至今的一段话',
  'Write this note': '写下这段话',
  'Kit’s sample note, pre-written for the demo.': 'Kit 的示例笔记，为演示预先写好。',
  'Notes are written by Beyond’s letter writer, which isn’t switched on yet.':
    '笔记由 Beyond 的写信服务撰写，它还没有开启。',
  'The note couldn’t be written. Try again.': '这段话没能写出来，请再试一次。',
  'Today’s notes are used up. Try again tomorrow.': '今天的笔记次数已用完，请明天再试。',
  "Draw a theme's constellation": '画出一个主题的星座',
  Theme: '主题',
  All: '全部',
  'Your Life Film': '你的人生胶片',
  'Life Film frames': '人生胶片画面',
  'One frame per month, with a line you wrote that month. Nobody else is in it to compare against.':
    '每月一帧，配上你那个月写下的一句话。里面没有别人，也就无从比较。',
  'Your year as one sky, and one frame per month in your own words.':
    '你的一年是一片星空，每月一帧，用你自己的话。',
  'Your year fills in as letters arrive. Each night you write becomes a star.':
    '信一封封到来，你的一年也会慢慢填满。你写下的每个夜晚，都会变成一颗星。',
  'No kept letters here yet. Each night you write becomes a star.':
    '这里还没有信。你写下的每个夜晚，都会变成一颗星。',
  'There are no kept letters here yet.': '这里还没有信。',
  'Reading your letters…': '正在读你的信……',

  /* ---- a direction's own page ---- */
  'Your map': '你的星图',
  'Back to your map': '返回你的星图',
  'You are at the centre. Larger circles have more nights behind them, and brighter threads mean a stronger pull. Tap a direction to open it.':
    '你在中心。圆越大，背后的夜晚越多；光线越亮，牵引越强。点一个方向，就能打开它。',
  'A possibility, not a label.': '一种可能，不是标签。',
  'Pop it': '戳破它',
  'You come alive turning ideas into something people can use.':
    '把想法变成别人用得上的东西时，你最有活力。',
  'You light up when you’re building something that works.': '亲手做出能用的东西时，你会眼睛发亮。',
  'You lose track of time when you’re making something of your own.':
    '做属于自己的东西时，你会忘了时间。',
  'You come alive when you’re following a question that interests you.':
    '追着一个让你好奇的问题走下去时，你最有活力。',
  'You light up when you’re bringing people together.': '把人聚在一起的时候，你会发光。',
  'You feel most like yourself when you’re out seeing somewhere new.':
    '走出去看看新地方时，你最像你自己。',
  'The nights this direction appeared.': '这个方向出现过的夜晚。',
  'Your journals about this': '关于这个方向的日记',
  'Try it': '试试看',
  'Small ways to test this direction in real life.': '在现实生活里试试这个方向的小方法。',
  'Changed your mind?': '改变主意了？',
  'Not sure anymore?': '不太确定了？',
  'Back to a suggestion': '变回建议',
  Undo: '撤销',

  /* ---- Growth ---- */
  Growth: '成长',
  'Growth views': '成长视图',
  'Your month in stars': '你这个月的星空',
  'Your year in stars': '你这一年的星空',
  'Each star is a night you wrote. Brighter means lighter.':
    '每颗星都是你写下的一个夜晚。越亮，那晚越轻松。',
  'What took up your year': '这一年你在忙什么',
  'The themes you wrote about most.': '你写得最多的主题。',
  'Your compass': '你的指南针',
  'Where your journal is pointing.': '你的日记正指向哪里。',
  'What you love': '你热爱的',
  'What you’re good at': '你擅长的',
  'What matters to you': '你在乎的',
  'What’s within reach': '触手可及的',
  'Still forming': '还在成形',
  'Pointing toward': '正指向',
  'Where you come alive': '让你充满活力的地方',
  'Top right is where your energy and focus meet.': '右上角是你的精力和专注交汇的地方。',
  bored: '无聊',
  absorbed: '投入',
  'gives you energy': '给你能量',
  'drains you': '消耗你',
  'Activities by energy and focus': '按精力和专注排列的活动',
  'How this month compares to last.': '这个月和上个月相比。',
  'What changed since your first month': '和你的第一个月相比',
  'Threads that last': '延续的线索',
  'What keeps coming back, and what faded.': '哪些一直出现，哪些渐渐淡去。',
  faded: '淡去',
  'Try it before you decide': '先试试，再决定',
  'Small real-world experiments for the direction you’re exploring.':
    '为你正在探索的方向，做一些小小的现实尝试。',
  Tried: '试过了',
  'Not for me. Future letters will suggest something different.': '不适合我。以后的信会换个建议。',
  'One frame per month, with a line you wrote that month.': '每月一帧，配上你那个月写下的一句话。',
  'A few more nights and your themes will show here.': '再写几个晚上，你的主题就会出现在这里。',
  'A few more nights and your compass will start to form.':
    '再写几个晚上，你的指南针就会开始成形。',
  'A few more nights and your map will fill in.': '再写几个晚上，这张图就会慢慢填满。',
  'A few more nights and changes will show here.': '再写几个晚上，变化就会出现在这里。',
  'A few more months and changes will show here.': '再过几个月，变化就会出现在这里。',
  'A few more nights and the threads will show here.': '再写几个晚上，线索就会出现在这里。',
  'Small experiments will appear here as your letters suggest them.':
    '信里提到的小尝试，会出现在这里。',
  Previous: '上一个',

  /* ---- settings ---- */
  'How your letters are written, what Beyond remembers, your data, and where to find help.':
    '信是怎么写的、Beyond 记住了什么、你的数据，以及去哪里求助。',
  Mode: '模式',
  'Demo mode: Kit’s sample letters next to yours': '演示模式：Kit 的示例信和你的信放在一起',
  'Beyond starts in Demo mode, for showing it to others such as judges. Kit is fictional; the sample letters show what months of Beyond look like. A night you seal is saved to your account and its letter is written by the AI, in both modes. Turn Demo mode off for Normal mode, just your own journal.':
    'Beyond 默认是演示模式，方便展示给评委等人看。Kit 是虚构人物，示例信展示了用上几个月 Beyond 的样子。无论哪种模式，你封存的夜晚都会保存到你的账户，并由 AI 写信。关掉演示模式就是普通模式，只有你自己的日记。',
  'Normal mode: just your own journal. Demo mode is in Settings.':
    '普通模式：只有你自己的日记。演示模式在设置里。',
  'Normal mode: just your own journal.': '普通模式：只有你自己的日记。',
  'Demo mode: sample nights and Kit’s sample letters are back.': '演示模式：Kit 的示例信回来了。',
  'Demo mode: Kit’s sample letters (fictional) are shown with yours.':
    '演示模式：Kit 的示例信（虚构）会和你的信一起显示。',
  'Switch to Normal mode': '切换到普通模式',
  'Who writes your letters': '谁来写你的信',
  'Applies to your next letter. The voice changes tone only, never the facts.':
    '从下一封信开始生效。语气只改变口吻，不会改变事实。',
  'When they arrive': '什么时候送达',
  'Let me open a letter right away (“Read it now”)': '允许我马上拆信（“现在就读”）',
  'Beyond is built around sleeping on it, but it’s your letter. Turn this off if you’d rather not be tempted.':
    'Beyond 的本意是让你睡一觉再看，但信是你的。如果不想被诱惑，就关掉这个选项。',
  '“Read it now” is on.': '“现在就读”已开启。',
  '“Read it now” is turned off in Settings.': '“现在就读”已在设置中关闭。',
  Language: '语言',
  'Write letters in': '信件语言',
  'Auto · match my writing': '自动 · 跟随我写的语言',
  'Auto writes back in the language you wrote in. Your own words are always quoted exactly as you wrote them.':
    '选择“自动”时，会用你写日记的语言回信。你自己的话永远原样引用。',
  'When I talk': '说话时',
  'Auto (any mix of 粵語, 普通话, English)': '自动（粤语、普通话、英语任意混合）',
  'Auto understands any mix of 粵語, 普通话 and English. Beyond records, turns it into text, then deletes the audio.':
    '“自动”能听懂粤语、普通话和英语的任意混合。Beyond 会录音、转成文字，然后删除音频。',
  'Your browser turns your voice into text (Chrome uses Google’s speech service, Safari uses Apple’s), one language at a time. Beyond keeps only the words.':
    '你的浏览器会把声音转成文字（Chrome 使用 Google 的语音服务，Safari 使用 Apple 的），一次只能识别一种语言。Beyond 只保留文字。',
  'This browser can’t turn speech into text. Use Chrome, Edge or Safari, or your device’s dictation.':
    '这个浏览器无法把语音转成文字。请使用 Chrome、Edge 或 Safari，或者用设备自带的听写功能。',
  'Memory and privacy': '记忆与隐私',
  'What Beyond remembers': 'Beyond 记住了什么',
  'What your letters may remember about you. Each one shows where it came from. Edit or forget anything, any time.':
    '你的信可能会记住的关于你的事。每一条都标明了来源，随时可以编辑或忘记。',
  'Nothing yet. Beyond learns at most two small things from a letter, and only things you wrote.':
    '暂时还没有。Beyond 每封信最多记住两件小事，而且只记你写过的内容。',
  'Tell Beyond something to remember': '告诉 Beyond 要记住什么',
  'Tell Beyond something to remember…': '告诉 Beyond 要记住什么……',
  Remember: '记住',
  'You told Beyond': '你告诉 Beyond 的',
  'From a letter': '来自一封信',
  'Learned from': '来源',
  Edit: '编辑',
  Forget: '忘记',
  'Edit memory': '编辑这条记忆',
  'Keep it': '保留',
  Save: '保存',
  Cancel: '取消',
  '. Not used: its letter is kept out of Growth': '。未使用：它所在的信不计入成长',
  'Forgotten.': '已忘记。',
  'Forgotten. Beyond won’t learn it again from old letters.':
    '已忘记。Beyond 不会再从旧信里学到这一点。',
  'Couldn’t forget that just now. Try again.': '刚才没能忘记这一条，请再试一次。',
  'That memory changed elsewhere. Showing the latest.': '这条记忆在别处被修改过，已显示最新内容。',
  'Pause memory (letters won’t use it)': '暂停记忆（信件不会使用）',
  'Memory paused. Letters won’t use it.': '记忆已暂停，信件不会使用。',
  'Memory is on again.': '记忆已重新开启。',
  'What the AI sees': 'AI 能看到什么',
  'Letters are written by Claude through Beyond’s letter service, after you seal a night.':
    '你封存一晚之后，信由 Claude 通过 Beyond 的写信服务撰写。',
  'The AI sees only the entry it writes about, the headlines of a few earlier letters, and your memories (unless paused). It never sees letters you keep out of Growth.':
    'AI 只能看到它要回复的那篇日记、之前几封信的标题，以及你的记忆（暂停时除外）。不计入成长的信，它永远看不到。',
  'Your data': '你的数据',
  'Saved to your Beyond account, private to you. Nothing you write is kept in this browser.':
    '保存在你的 Beyond 账户里，只有你能看到。你写的内容不会保存在这个浏览器里。',
  'Download a copy': '下载副本',
  'as a JSON file of everything in your account.': '，以 JSON 文件导出你账户里的所有内容。',
  'Preparing your copy…': '正在准备你的副本……',
  'Saved a copy of your journal.': '已保存你的日记副本。',
  'Delete my journal': '删除我的日记',
  'Delete everything': '全部删除',
  "This can't be undone. Download a copy first if you might want it. Your account stays, empty.":
    '此操作无法撤销。如果以后可能需要，请先下载副本。你的账户会保留，但内容会清空。',
  'Your journal was deleted.': '你的日记已删除。',
  'Delete my account': '删除我的账户',
  'Delete your Beyond account?': '要删除你的 Beyond 账户吗？',
  "Your account and everything in it are removed for good within a few minutes. This can't be undone.":
    '你的账户及其中的所有内容会在几分钟内被永久删除，无法撤销。',
  'Your account is being deleted. Everything in it will be gone within a few minutes.':
    '你的账户正在删除，所有内容将在几分钟内清除。',
  'Confirm it’s you': '确认是你本人',
  'For your safety, downloading or deleting needs a fresh sign-in.':
    '为了你的安全，下载或删除前需要重新登录。',
  Account: '账户',
  'Signed in as': '当前登录',
  'Sign out': '退出登录',
  Privacy: '隐私',
  'About Beyond': '关于 Beyond',
  'Couldn’t save that setting. Check your connection.': '没能保存这个设置，请检查网络。',
  'Couldn’t save that. Check your connection.': '没能保存，请检查网络。',
  Open: '打开',

  /* ---- voices ---- */
  Friend: '朋友',
  Mentor: '导师',
  'Future you': '未来的你',
  'Plain diary': '纯日记',
  'Warm, direct, a little funny.': '温暖、直接，带点幽默。',
  'Clear, structured, honest.': '清晰、有条理、坦诚。',
  'Writes back from a few years ahead.': '从几年后给你回信。',
  'Just the summary. No voice.': '只有摘要，不带语气。',
  '“Hey, so about last night…”': '“嘿，说说昨晚吧……”',
  '“Good morning. Three things stood out.”': '“早上好。有三件事值得一提。”',
  '“Hi. It’s you, a few years from now.”': '“你好，我是几年后的你。”',

  /* ---- support ---- */
  'Talk to someone tonight.': '今晚找个人聊聊。',
  "Beyond isn't watched by a person and can't respond in an emergency. A morning letter is never emergency help. These people in Hong Kong can help right now, free and confidential.":
    'Beyond 没有专人看守，无法在紧急情况下回应。早上的信永远不能代替紧急求助。下面这些香港的机构现在就能帮你，免费且保密。',
  'All human support in Hong Kong': '香港的全部人工支援',
  "Checked on 8 Oct 2026 against Mind HK's “Find help now” page. Outside Hong Kong, call your local emergency number.":
    '已于 2026年10月8日 对照 Mind HK 的“Find help now”页面核实。在香港以外，请拨打当地的紧急电话。',
  'Beyond is a journal, not a crisis service. If you’re struggling or in danger, people can help right now, free and confidential.':
    'Beyond 是一本日记，不是危机支援服务。如果你正感到难熬或身处危险，现在就有人可以帮你，免费且保密。',

  /* ---- messages ---- */
  'Can’t reach Beyond. Check your connection.': '连不上 Beyond，请检查网络。',
  'Couldn’t reach Beyond. Check your connection and try again.':
    '连不上 Beyond，请检查网络后再试。',
  'Please sign in again. Your words are still here.': '请重新登录。你写的内容还在。',
  'Today’s letters are used up. Your words are still here.':
    '今天的信件次数已用完。你写的内容还在。',
  'Today’s letters are used up. Try again tomorrow.': '今天的信件次数已用完，请明天再试。',
  'Couldn’t seal tonight. Your words are still here; check your connection and try again.':
    '今晚没能封存。你写的内容还在，请检查网络后再试。',
  'Beyond’s letter writer couldn’t be reached. Your words are safe. Try again.':
    '连不上 Beyond 的写信服务。你写的内容很安全，请再试一次。',
  'Beyond’s letter writer isn’t switched on yet. Seal tonight anyway: your letter is kept safe and written as soon as it is.':
    'Beyond 的写信服务还没有开启。照样可以封存今晚：你的信会被妥善保存，服务一开启就会写好。',
  'Beyond’s letter writer isn’t switched on yet. Sealed nights wait safely and are written as soon as it is.':
    'Beyond 的写信服务还没有开启。封存的夜晚会安全地等着，服务一开启就会写好。',
  'The letter didn’t pass Beyond’s checks (quotes must be your exact words, and there must be three to-dos). Try again.':
    '这封信没有通过 Beyond 的检查（引用必须是你的原话，而且要有三件小事）。请再试一次。',
  'The letter writer declined to write about this night. Your words are safe, and you can try again.':
    '写信服务没有为这一晚写信。你写的内容很安全，可以再试一次。',
  'Couldn’t turn the recording into words. Try again, or type.':
    '没能把录音转成文字。请再试一次，或者直接打字。',
  'No speech was heard. Try again, or type.': '没有听到声音。请再试一次，或者直接打字。',
  'No sound reached Beyond. Check that your microphone is on and is the one your browser uses.':
    'Beyond 没有收到声音。请检查麦克风是否开启，并且是浏览器正在使用的那一个。',
  'No microphone was found. You can type instead.': '没有找到麦克风，你可以直接打字。',
  'The microphone is blocked. Allow it from the icon in the address bar, then tap again.':
    '麦克风被禁用了。请在地址栏的图标里允许使用，然后再点一次。',
  'The microphone is blocked. Allow it in your browser settings, or use your keyboard’s dictation.':
    '麦克风被禁用了。请在浏览器设置里允许使用，或者用键盘自带的听写功能。',
  'Speech recognition didn’t start in this browser. Try Chrome, Edge or Safari.':
    '这个浏览器没能启动语音识别。请试试 Chrome、Edge 或 Safari。',
  'Speech recognition is switched off in this browser (on a Mac, Safari needs Dictation turned on in System Settings).':
    '这个浏览器关闭了语音识别（在 Mac 上，Safari 需要在系统设置里开启听写）。',
  'This browser couldn’t reach its speech service (Chrome’s is Google’s, which needs a VPN in mainland China).':
    '这个浏览器连不上它的语音服务（Chrome 使用的是 Google 的服务，在中国大陆需要 VPN）。',
  'Switched to recording. Tap the light again and talk; your words appear when you stop.':
    '已切换为录音。再点一下光点就可以说话，停下后文字会出现。',

  /* voice typing hints, split around a bold key name */
  press: '按',
  'Fn (🌐) twice': '两下 Fn（🌐）键',
  'and just talk.': '，然后直接说话。',
  'tap the': '点一下',
  '🎤 on your keyboard': '键盘上的 🎤',
  'start your device’s': '打开设备的',
  dictation: '听写功能',
  '粵 + 普 + EN': '粤 + 普 + 英',

  /* ---- welcome noise ---- */
  "what's next": '接下来呢',
  'everyone else': '别人都',
  'lunch alone?': '一个人吃饭？',
  'group chat': '群聊',
  GPA: 'GPA',
  'which major?': '选什么专业？',
  'should I': '我该不该',
  behind: '落后了',
  notifications: '消息通知',
  'new campus': '新校园',
  'seen 11:47pm': '已读 23:47',
  'internship?': '实习？',
};

for (const [en, zh] of Object.entries(THEMES)) {
  PHRASES[en] ??= zh;
  PHRASES[en[0].toUpperCase() + en.slice(1)] ??= zh;
}
for (const [en, zh] of Object.entries({ ...DIRECTIONS, ...VOICES })) PHRASES[en] ??= zh;
for (const [en, zh] of Object.entries(SUPPORT_NAMES)) PHRASES[en] = zh;
for (const [en, zh] of Object.entries(SUPPORT_NOTES)) PHRASES[en] = zh;
for (const [n, nz] of Object.entries(SUPPORT_NAMES)) {
  for (const [note, notez] of Object.entries(SUPPORT_NOTES))
    PHRASES[`${n}. ${note}`] = `${nz}。${notez}`;
}
for (const [m] of Object.entries(MONTH)) PHRASES[m] = mo(m);
for (const [m] of Object.entries(MON)) PHRASES[m] = mo(m);
// Journal book
Object.assign(PHRASES, {
  'Days in your journal': '日记里的日子',
  'Open the calendar': '打开日历',
  Calendar: '日历',
  'Highlighted days have writing. Tap one to turn to it.':
    '亮起的日子有写过东西。点一下就翻到那一天。',
  'Turn to an earlier day': '翻到更早的一天',
  'Turn to a later day': '翻到更晚的一天',
  'Your journal starts here.': '你的日记从这里开始。',
  'Every night you seal becomes a page you can turn back to.':
    '每个封存的夜晚，都会变成可以翻回去看的一页。',
  'Letter on its way': '来信在路上',
  "This letter couldn't be written yet.": '这封信暂时还没能写好。',
  Sealed: '已封存',
  Today: '今天',
  'Previous month': '上个月',
  'Next month': '下个月',
  'Back to today': '回到今天',
  'Close the calendar': '关闭日历',
  Close: '关闭',
  'Draft saved': '草稿已保存',
  'Open in your journal': '在日记里打开',
  'Last night’s letter': '昨晚的来信',
  'Passion compass': '热情罗盘',
  'Write anything': '想写什么都可以',
  'Settings sections': '设置分类',
  'Kit’s fictional sample letters next to yours, for showing Beyond to others. Nights you seal are saved and answered by the AI in both modes.':
    '在你的来信旁边显示虚构人物 Kit 的示例信，方便向别人展示 Beyond。两种模式下，你封存的夜晚都会保存，并由 AI 回信。',
  'Demo mode: Kit’s sample letters next to yours': '演示模式：在你的来信旁边显示 Kit 的示例信',
  'Applies to your next letter. The voice changes the tone only, never the facts.':
    '从下一封信开始生效。语气只改变口吻，不会改变事实。',
  'Beyond adds this itself. The letter writer never sees it.':
    '由 Beyond 自己加上，写信的 AI 看不到。',
  'Your letter is ready at this time the next morning.': '第二天早上这个时间，你的信就准备好了。',
  '“Read it now”': '“现在就读”',
  'Let me open a letter right away instead of waiting for the morning.':
    '让我马上打开来信，不用等到早上。',
  'Let me open a letter right away (“Read it now”)': '让我马上打开来信（“现在就读”）',
  'Auto writes back in the language you wrote in. Your words are always quoted as you wrote them.':
    '自动：用你写日记的语言回信。你的原话总是照原样引用。',
  'Each one shows where it came from. Edit or forget anything, any time.':
    '每一条都写明来源。随时可以修改或忘记。',
  'Only the entry it writes about, the headlines of a few earlier letters, and your memories (unless paused). Never letters you keep out of Growth.':
    '只有它要回信的那篇日记、几封旧信的标题，以及你的记忆（除非已暂停）。不包括你设为不计入成长的信。',
  'A JSON file of everything in your account.': '包含你账户里所有内容的 JSON 文件。',
  'What you love, are good at and care about': '你喜欢的、擅长的、在乎的',
  'Read from this month’s nights: what you enjoy, what you do well, what matters to you, and what’s within reach.':
    '来自这个月的夜晚：你喜欢做的、做得好的、在乎的，以及触手可及的机会。',
  'Read from this year’s nights: what you enjoy, what you do well, what matters to you, and what’s within reach.':
    '来自今年的夜晚：你喜欢做的、做得好的、在乎的，以及触手可及的机会。',
  'What gives you energy': '什么让你有能量',
  'Each dot is something you did. Higher means it gave you more energy; further right means you lost track of time.':
    '每个点是你做过的一件事。越高表示越让你有能量；越靠右表示你越投入、忘了时间。',
  'Themes you wrote about more, less, or for the first time.':
    '写得更多、更少，或第一次出现的主题。',
  'How your year has changed': '你的这一年有什么变化',
  'What you wrote about most': '你写得最多的事',
  'Your top themes this month, by number of nights.': '这个月写得最多的主题，按夜晚数排列。',
  'Your top themes this year, by number of nights.': '今年写得最多的主题，按夜晚数排列。',
  'The nights you wrote': '你写过的夜晚',
  'One star per night. Brighter means a lighter night.': '一颗星是一个夜晚。越亮表示那晚越轻松。',
  'One line from each month': '每个月的一句话',
  'A frame for every month, with something you wrote then.': '每个月一格，配上你那时写下的一句话。',
  Read: '阅读',
  Filters: '筛选',
  'demo letter': '演示信',
});
for (const [w, z] of Object.entries(WD)) PHRASES[w] = z;

export const ZH: Record<string, string> = PHRASES;

const nights = (k: string): string => `${k} 个晚上`;

/** Wording with a date, count or name in it. Content (headlines, quotes) passes through as is. */
export const ZH_PATTERNS: [RegExp, (...m: string[]) => string][] = [
  [
    /^\s*– (Past journal|Earlier today)$/,
    (k) => ` – ${k === 'Past journal' ? '过去的日记' : '今天早些时候'}`,
  ],
  [new RegExp(`^How this month differs from ${MONTHS}$`), (m) => `这个月和${mo(m)}有什么不同`],
  [/^Read the letter: (.+)$/s, (t) => `读信：${t}`],
  [
    new RegExp(`^${DAY}(, sample|, demo letter)?: (?!write$)(.+)$`, 's'),
    (w, d, m, x, t) =>
      `${day(w, d, m)}${x ? (x.includes('sample') ? '，示例' : '，演示信') : ''}：${t}`,
  ],
  [
    /^Last night’s letter, (sample|demo letter)$/,
    (x) => `昨晚的来信，${x === 'sample' ? '示例' : '演示信'}`,
  ],
  [/^(\d+) letters? so far$/, (k) => `目前共有 ${k} 封来信`],
  [new RegExp(`^${DAY}, demo letter$`), (w, d, m) => `${day(w, d, m)}，演示信`],
  [/^(\d{1,2}):(\d{2})(am|pm)$/, (h, m, x) => `${x === 'am' ? '上午' : '下午'} ${h}:${m}`],
  [/^Sealed\. Your letter arrives at (\d\d:\d\d)\.$/, (t) => `已封存。你的信会在 ${t} 送达。`],
  [new RegExp(`^Today, ${DAY}: write$`), (w, d, m) => `今天，${day(w, d, m)}：写日记`],
  [
    new RegExp(`^${DAY}, today(: write)?$`),
    (w, d, m, x) => `${day(w, d, m)}，今天${x ? '：写日记' : ''}`,
  ],
  [new RegExp(`^${DAY}: write$`), (w, d, m) => `${day(w, d, m)}：写日记`],
  [/^(\d+) nights?, newest first\.$/, (k) => `${k} 个晚上，最新的在前。`],
  [/^Show all (\d+)$/, (k) => `显示全部 ${k} 篇`],
  [/^Popped (.+)\.$/, (d) => `已戳破“${dir(d)}”。`],
  [/^Does (.+) fit you\?$/, (d) => `“${dir(d)}”适合你吗？`],
  [new RegExp(`^No nights from ${MO} to compare with\\.$`), (m) => `${mo(m)}没有夜晚可以比较。`],
  [/^More nights about (.+)$/, (t) => `写到${theme(t)}的夜晚多了`],
  [/^Fewer nights about (.+)$/, (t) => `写到${theme(t)}的夜晚少了`],
  [/^New: (.+) showed up for the first time$/, (t) => `新出现：${theme(t)}第一次出现`],
  [new RegExp(`^${MONTHS} compared with ${MONTHS}\\.$`), (a, b) => `${mo(a)}和${mo(b)}相比。`],
  [/^Threads across (\d+) months$/, (k) => `${k} 个月里的线索`],
  [
    /^In (\w+) you were pointing toward (.+)\. Now (.+)\.$/,
    (m, a, b) => `${mo(m)}时，你正指向${a}。现在是${b}。`,
  ],
  [
    /^(.+), (\d+) nights?\. Show these nights in Letters$/,
    (t, k) => `${theme(t)}，${k} 个晚上。在来信里查看这些夜晚`,
  ],
  [
    /^(What you love|What you’re good at|What matters to you|What’s within reach): (.+)$/,
    (k, v) => `${PHRASES[k] ?? k}：${v === 'Still forming' ? '还在成形' : v}`,
  ],
  [
    /^Written by (.+)\. Every line is checked against your words\.$/,
    (m) => `由 ${m} 撰写。每一句都和你写下的话核对过。`,
  ],
  [
    new RegExp(`^Small step for ${DAY}: (done, gold seal|not done yet)$`),
    (w, d, m, x) =>
      `${day(w, d, m)} 的一小步：${x.startsWith('done') ? '已完成，获得金印' : '还没完成'}`,
  ],
  // dates
  [new RegExp(`^${DAY}$`), day],
  [new RegExp(`^${DAY}, summary$`), (w, d, m) => `${day(w, d, m)}，摘要`],
  [new RegExp(`^“${DAY}, summary”$`), (w, d, m) => `“${day(w, d, m)}，摘要”`],
  [new RegExp(`^${DAY}, sample$`), (w, d, m) => `${day(w, d, m)}，示例`],
  [new RegExp(`^${DAY}, demo( letter)?$`), (w, d, m) => `${day(w, d, m)}，演示`],
  [new RegExp(`^${DAY}, Kit’s sample$`), (w, d, m) => `${day(w, d, m)}，Kit 的示例`],
  [
    new RegExp(`^(Latest|New) letter, ${DAY}(, sample|, demo letter)?$`),
    (k, w, d, m, x) =>
      `${k === 'New' ? '新来信' : '最新来信'}，${day(w, d, m)}${x ? (x.includes('demo') ? '，演示' : '，示例') : ''}`,
  ],
  [
    new RegExp(`^Open the letter from ${DAY}: (.+)$`),
    (w, d, m, h) => `打开 ${day(w, d, m)} 的信：${h}`,
  ],
  [
    new RegExp(`^To-dos for ${DAY}: all done, gold seal$`),
    (w, d, m) => `${day(w, d, m)} 的小事：全部完成，获得金印`,
  ],
  [
    new RegExp(`^To-dos for ${DAY}: (\\d+) of (\\d+) done$`),
    (w, d, m, a, b) => `${day(w, d, m)} 的小事：已完成 ${a}/${b}`,
  ],
  [new RegExp(`^${DAY}: (.+)$`), (w, d, m, h) => `${day(w, d, m)}：${h}`],
  [
    new RegExp(`^Your letter for ${DAY} arrives at (\\d\\d:\\d\\d)\\.$`),
    (w, d, m, t) => `你 ${day(w, d, m)} 的信将在 ${t} 送达。`,
  ],
  [/^This letter arrives at (\d\d:\d\d)\.$/, (t) => `这封信将在 ${t} 送达。`],
  [
    new RegExp(`^The letter for ${DAY} couldn't be written yet\\.$`),
    (w, d, m) => `${day(w, d, m)} 的信暂时还写不出来。`,
  ],
  [/^Written and sealed until (\d\d:\d\d)$/, (t) => `已写好并封存，${t} 送达`],
  [/^New letters will arrive at (\d\d:\d\d)\.$/, (t) => `新的信将在 ${t} 送达。`],
  [/^Your letters? will arrive at (\d\d:\d\d)\.$/, (t) => `你的信将在 ${t} 送达。`],
  [/^Checked on (\d+) (\w+) (\d{4})/, (d, m, y) => `已于 ${y}年${MON[m] ?? MONTH[m]}月${d}日 核实`],

  // months
  [new RegExp(`^${MONTHS} (\\d{4})$`), (m, y) => `${y}年${mo(m)}`],
  [new RegExp(`^${MO} (\\d{4})$`), (m, y) => `${y}年${mo(m)}`],
  [new RegExp(`^${MO} (\\d{4}) · sample$`), (m, y) => `${y}年${mo(m)} · 示例`],
  [new RegExp(`^${MONTHS}: open this month$`), (m) => `${mo(m)}：打开这个月`],
  [new RegExp(`^A note on ${MONTHS}$`), (m) => `写给你${mo(m)}的一段话`],
  [new RegExp(`^What changed since ${MO}$`), (m) => `和${mo(m)}相比的变化`],
  [
    new RegExp(`^No kept letters from ${MO} to compare with\\.$`),
    (m) => `${mo(m)}没有信可以比较。`,
  ],
  [
    new RegExp(`^About the same things came up as in ${MO}\\.$`),
    (m) => `和${mo(m)}出现的事情差不多。`,
  ],
  [
    new RegExp(`^(\\d+) nights? in ${MO}, (\\d+) this month$`),
    (a, m, b) => `${mo(m)} ${a} 个晚上，本月 ${b} 个`,
  ],
  [
    new RegExp(`^(\\d+) nights? kept since ${MONTHS}$`),
    (k, m) => `自${mo(m)}起，写下了 ${k} 个晚上`,
  ],
  [
    new RegExp(
      `^nights? written since (\\d{1,2}) ${MONTHS} (\\d{4})\\. (\\d+) letters? arrived, (\\d+) with a gold seal\\.$`,
    ),
    (d, m, y, a, g) =>
      `个晚上，从 ${y}年${mo(m)}${d}日 写到现在。收到 ${a} 封信，其中 ${g} 封获得金印。`,
  ],

  // counts
  [/^([1-4]) of 4$/, (k) => `${k} / 4`],
  [/^(\d+) letters?$/, (k) => `${k} 封信`],
  [/^(\d+) letters?\.$/, (k) => `${k} 封信。`],
  [/^(\d+) letters? of (\d+)\.$/, (a, b) => `${b} 封信中的 ${a} 封。`],
  [/^(\d+) letters? earned a gold seal\.$/, (k) => `${k} 封信获得了金印。`],
  [
    /^(\d+) letters? match(?:es)? “(.+)”, (\d+) mentions?( with these filters)?\.$/,
    (k, q, h, f) => `${k} 封信符合“${q}”${f ? '（在当前筛选下）' : ''}，共出现 ${h} 次。`,
  ],
  [
    /^0 letters match “(.+)”( with these filters)?\.$/,
    (q, f) => `没有信符合“${q}”${f ? '（在当前筛选下）' : ''}。`,
  ],
  [/^Nothing matches “(.+)”\.$/, (q) => `没有找到符合“${q}”的信。`],
  [/^(\d+) nights?$/, nights],
  [/^, (\d+) nights?$/, (k) => `，${k} 个晚上`],
  [/^(\d+) nights? written$/, (k) => `写了 ${k} 个晚上`],
  [/^(\d+) nights? · (.+)$/, (k, t) => `${k} 个晚上 · ${theme(t)}`],
  [/^In progress · (\d+) nights? · (.+)$/, (k, t) => `进行中 · ${k} 个晚上 · ${theme(t)}`],
  [/^(\d+) of (\d+) nights?$/, (a, b) => `${b} 个晚上中的 ${a} 个`],
  [/^of your (\d+) kept nights?$/, (k) => `个晚上，来自你写下的 ${k} 个晚上`],
  [/^of (\d+) to-dos$/, (k) => `/ ${k} 件小事`],
  [/^(\d+) of (\d+) done$/, (a, b) => `已完成 ${a}/${b}`],
  [
    /^(\d+) of (\d+) done\. Tap to check them off\.$/,
    (a, b) => `已完成 ${a}/${b}，点一下就能勾掉。`,
  ],
  [
    /^(\d+) words? written at (\d\d:\d\d|—)\. Sleep well\. It will be waiting here\.$/,
    (k, t) => `${k} 个字，写于 ${t}。好好睡吧，它会在这里等你。`,
  ],
  [
    /^Write (\d+) more nights? to see your first direction\.$/,
    (k) => `再写 ${k} 个晚上，就能看到你的第一个方向。`,
  ],
  [/^Evidence: (\d+) letters?$/, (k) => `依据：${k} 封信`],
  [/^Dismissed or removed \((\d+)\)$/, (k) => `已忽略或移除（${k}）`],
  [
    /^Delete (\d+) letters?, your memories and everything you wrote\?$/,
    (k) => `要删除 ${k} 封信、你的记忆和你写过的一切吗？`,
  ],
  [/^(\d+) min, (\w+)$/, (k, kind) => `${k} 分钟 · ${KINDS[kind] ?? kind}`],
  [/^Copied (.+)$/, (x) => `已复制 ${x}`],

  // names
  [
    /^(.+), (confirmed|suggested), (\d+) nights?$/,
    (d, s, k) => `${dir(d)}，${s === 'confirmed' ? '已确认' : '建议'}，${k} 个晚上`,
  ],
  [
    /^(Confirmed|Suggested), (\d+) nights?$/,
    (s, k) => `${s === 'Confirmed' ? '已确认' : '建议'}，${k} 个晚上`,
  ],
  [
    /^(\d+) letters? about (.+), from (\w+) to (\w+)$/,
    (k, d, a, b) => `${k} 封关于“${dir(d)}”的信，从${mo(a)}到${mo(b)}`,
  ],
  [
    /^(\d+) kept letters?, (?:across (\d+) months, )?touch on (.+), for example “(.+)”\. A possibility you might recognise in yourself, if it fits\. Not a label\.$/,
    (k, months, b, h) =>
      `${k} 封信${months ? `，跨越 ${months} 个月，` : ''}都谈到了${BLURBS[b] ?? b}，比如“${h}”。如果合适，这也许是你会在自己身上认出的一种可能，而不是标签。`,
  ],
  [
    /^From your (.+) · (\d+) more letters? waiting$/,
    (v, k) => `来自你的${VOICES[v] ?? v} · 还有 ${k} 封信在等你`,
  ],
  [/^From your (.+)$/, (v) => `来自你的${VOICES[v] ?? v}`],
  [/^Your next letter comes from your (.+)$/, (v) => `下一封信将来自你的${VOICES[v] ?? v}`],
  [/^Auto \((.+)\)$/, (l) => `自动（${l}）`],
  [/^When you talk, Beyond listens in (.+)\.$/, (l) => `你说话时，Beyond 会用${l}来听。`],
  [
    /^This browser can’t listen in (.+)\. Pick another language\.$/,
    (l) => `这个浏览器无法识别${l}，请换一种语言。`,
  ],
  [
    /^Written by (.+)\. Every quote is checked against your words\.$/,
    (m) => `由 ${m} 撰写。每一句引用都和你的原话核对过。`,
  ],
  [/^Written by (.+) from (\d+) letters?(.*)$/, (m, k) => `由 ${m} 根据 ${k} 封信撰写。`],
  [
    /^A pre-written sample note for demo mode, built from (\d+) letters? and their own words\.$/,
    (k) => `演示模式的预写示例笔记，根据 ${k} 封信和其中的原话写成。`,
  ],
  [/^Mark done: (.+)$/, (t) => `标记为完成：${t}`],
  [/^Mark not done: (.+)$/, (t) => `标记为未完成：${t}`],
];
