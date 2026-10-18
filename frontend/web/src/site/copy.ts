import { createContext, useContext } from 'react';
import { SHARED_ZH } from '../copy/zh';
export const CopyContext = createContext<'en' | 'zh'>('en');
export function useCopy() {
  const lang = useContext(CopyContext);
  return (text: string): string => (lang === 'zh' ? (SHARED_ZH[text] ?? text) : text);
}
