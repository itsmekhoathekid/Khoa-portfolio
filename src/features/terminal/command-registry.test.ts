import { describe, expect, it } from 'vitest';
import { parseCommand, redactCommand } from './command-registry';

describe('terminal command registry', () => {
  it('routes filesystem-shaped commands', () => {
    expect(parseCommand('./whoami')?.action).toEqual({
      type: 'navigate',
      path: '/home/anhkhoa',
    });
    expect(parseCommand('tail -n 3 experience.log')?.action).toEqual({
      type: 'navigate',
      path: '/experiences',
    });
    expect(parseCommand('ls -la /myworks/competitions')?.action).toEqual({
      type: 'work',
      kind: 'competitions',
    });
    expect(parseCommand('bat /blogs/agent-evals.md')?.action).toEqual({
      type: 'blog',
      slug: 'agent-evals',
    });
    expect(parseCommand('cat contacts.env')?.action).toEqual({
      type: 'navigate',
      path: '/contacts',
    });
    expect(parseCommand('ls -lt /blogs')?.action).toEqual({
      type: 'navigate',
      path: '/blogs',
    });
    expect(parseCommand('/theme dark')?.action).toEqual({
      type: 'theme',
      theme: 'dark',
    });
    expect(parseCommand('/search "agent evals"')?.action).toEqual({
      type: 'search',
      query: 'agent evals',
    });
    expect(parseCommand('/logout')?.action).toEqual({ type: 'logout' });
  });

  it('parses credentials but never returns them from redaction', () => {
    const raw = '/login username="admin" password="very-secret"';
    expect(parseCommand(raw)?.action).toEqual({
      type: 'login',
      username: 'admin',
      password: 'very-secret',
    });
    expect(redactCommand(raw)).toBe(
      '/login username="admin" password="••••••••"',
    );
    expect(redactCommand(raw)).not.toContain('very-secret');
  });

  it('rejects malformed login input', () => {
    expect(parseCommand('/login admin very-secret')).toBeNull();
  });

  it('redacts both current and new passwords', () => {
    const raw = '/passwd current="old-secret" new="new-secret"';
    expect(redactCommand(raw)).toBe(
      '/passwd current="••••••••" new="••••••••"',
    );
    expect(redactCommand(raw)).not.toContain('old-secret');
    expect(redactCommand(raw)).not.toContain('new-secret');
  });
});
