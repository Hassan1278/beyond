import type { createApiClient } from '@beyond/shared';
export interface Identity {
  id: string;
  email: string | null;
  recovery?: boolean;
}
export interface AuthAdapter {
  session(): Promise<Identity | null>;
  subscribe(listener: (identity: Identity | null) => void): () => void;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string): Promise<void>;
  resetPassword(email: string): Promise<void>;
  updatePassword(password: string): Promise<void>;
  google(): Promise<void>;
  signOut(): Promise<void>;
}
export interface AppRuntime {
  auth: AuthAdapter;
  apiForUser(userId: string): ReturnType<typeof createApiClient>;
  download(name: string, content: string): Promise<void>;
}
