import { notFound } from 'next/navigation';

/** The service has no pages; only the backend calls its /v1 routes. */
export default function Home(): never {
  notFound();
}
