import type { ReactElement } from 'react';

const hide = { 'aria-hidden': true } as const;

export const Signal = (): ReactElement => (
  <svg width="17" height="11" viewBox="0 0 17 11" {...hide}>
    <rect x="0" y="7" width="3" height="4" rx="1" fill="currentColor" />
    <rect x="4.5" y="5" width="3" height="6" rx="1" fill="currentColor" />
    <rect x="9" y="2.5" width="3" height="8.5" rx="1" fill="currentColor" />
    <rect x="13.5" y="0" width="3" height="11" rx="1" fill="currentColor" />
  </svg>
);

export const Wifi = (): ReactElement => (
  <svg width="15" height="11" viewBox="0 0 15 11" {...hide}>
    <path
      d="M7.5 2.2c2.2 0 4.2.8 5.7 2.2l1.1-1.1A9.6 9.6 0 0 0 7.5.6 9.6 9.6 0 0 0 .7 3.3l1.1 1.1A8 8 0 0 1 7.5 2.2Zm0 3.2c1.3 0 2.5.5 3.4 1.3L12 5.6a6.4 6.4 0 0 0-9 0l1.1 1.1c.9-.8 2.1-1.3 3.4-1.3Zm0 3.2c-.6 0-1.1.2-1.5.6l1.5 1.7L9 9.2c-.4-.4-.9-.6-1.5-.6Z"
      fill="currentColor"
    />
  </svg>
);

export const Battery = (): ReactElement => (
  <svg width="25" height="12" viewBox="0 0 25 12" {...hide}>
    <rect
      x=".5"
      y=".5"
      width="21"
      height="11"
      rx="3"
      fill="none"
      stroke="currentColor"
      opacity=".4"
    />
    <rect x="2" y="2" width="15" height="8" rx="1.6" fill="currentColor" />
    <path d="M23 4v4c.8-.3 1.3-1.1 1.3-2S23.8 4.3 23 4Z" fill="currentColor" opacity=".4" />
  </svg>
);

export const Moon = (): ReactElement => (
  <svg viewBox="0 0 24 24" {...hide}>
    <path
      d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
  </svg>
);

export const Mail = (): ReactElement => (
  <svg viewBox="0 0 24 24" {...hide}>
    <rect
      x="3"
      y="5.5"
      width="18"
      height="13"
      rx="2.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    />
    <path
      d="m4 7 8 6 8-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
  </svg>
);

export const Wave = (): ReactElement => (
  <svg viewBox="0 0 24 24" {...hide}>
    <path
      d="M3 17c3 0 3-8 6-8s3 6 6 6 3-9 6-9"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
  </svg>
);

export const You = (): ReactElement => (
  <svg viewBox="0 0 24 24" {...hide}>
    <circle cx="12" cy="8.5" r="3.8" fill="none" stroke="currentColor" strokeWidth="1.7" />
    <path
      d="M4.5 20c1.3-3.6 4.2-5.4 7.5-5.4s6.2 1.8 7.5 5.4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
  </svg>
);

export const Close = (): ReactElement => (
  <svg width="14" height="14" viewBox="0 0 14 14" {...hide}>
    <path d="M2 2l10 10M12 2 2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
