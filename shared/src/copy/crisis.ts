/**
 * The one list of crisis contacts Beyond shows anywhere: the site, the journal app
 * (Settings, the support page, the safety note while writing) and the letter writer's
 * urgent message. Change it here and every place follows.
 */
export const CRISIS_LINES = [
  { phone: '18111', name: 'Mental Health Support Hotline', nameZh: '精神健康支援熱線', hours: '24 hours' },
  { phone: '2896 0000', name: 'The Samaritans Hong Kong', nameZh: '撒瑪利亞會', hours: '24 hours' },
  { phone: '999', name: 'Emergency', nameZh: '緊急服務', hours: '' },
] as const;

/** The same three as plain lines, for a letter. */
export const CRISIS_TEXT = CRISIS_LINES.map(
  (c) => `${c.name}: ${c.phone}${c.hours ? ` (${c.hours})` : ''}`,
).join('\n');
