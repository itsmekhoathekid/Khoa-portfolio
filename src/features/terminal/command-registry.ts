export type WorkRoute = 'projects' | 'publications' | 'competitions';

export type TerminalAction =
  | {
      type: 'navigate';
      path: '/home/anhkhoa' | '/experiences' | '/contacts' | '/blogs';
    }
  | { type: 'work'; kind: WorkRoute | 'all' }
  | { type: 'blog'; slug: string }
  | { type: 'search'; query: string }
  | { type: 'theme'; theme: 'light' | 'dark' }
  | { type: 'login'; username: string; password: string }
  | { type: 'passwd'; currentPassword: string; newPassword: string }
  | { type: 'logout' }
  | { type: 'help' };

export interface CommandDefinition {
  name: string;
  aliases: readonly string[];
  sensitive: boolean;
  parse: (input: string) => TerminalAction | null;
}

const exact =
  (values: readonly string[], action: TerminalAction) => (input: string) =>
    values.includes(input) ? action : null;

export const commandRegistry: readonly CommandDefinition[] = [
  {
    name: 'whoami',
    aliases: ['./whoami', 'whoami'],
    sensitive: false,
    parse: exact(['./whoami', 'whoami'], {
      type: 'navigate',
      path: '/home/anhkhoa',
    }),
  },
  {
    name: 'experience',
    aliases: ['tail -n 3 experience.log'],
    sensitive: false,
    parse: exact(['tail -n 3 experience.log'], {
      type: 'navigate',
      path: '/experiences',
    }),
  },
  {
    name: 'myworks',
    aliases: ['ls -la /myworks'],
    sensitive: false,
    parse(input) {
      const match = input.match(
        /^ls -la \/myworks(?:\/(projects|publications|competitions))?$/,
      );
      return match
        ? { type: 'work', kind: (match[1] as WorkRoute | undefined) ?? 'all' }
        : null;
    },
  },
  {
    name: 'contacts',
    aliases: ['cat contacts.env'],
    sensitive: false,
    parse: exact(['cat contacts.env'], { type: 'navigate', path: '/contacts' }),
  },
  {
    name: 'blogs',
    aliases: ['ls -lt /blogs'],
    sensitive: false,
    parse: exact(['ls -lt /blogs'], { type: 'navigate', path: '/blogs' }),
  },
  {
    name: 'bat',
    aliases: ['bat /blogs/<slug>.md'],
    sensitive: false,
    parse(input) {
      const match = input.match(
        /^bat \/blogs\/([a-z0-9]+(?:-[a-z0-9]+)*)\.md$/,
      );
      return match ? { type: 'blog', slug: match[1] } : null;
    },
  },
  {
    name: 'search',
    aliases: ['/search "<query>"'],
    sensitive: false,
    parse(input) {
      const match = input.match(/^\/search\s+(.+)$/);
      return match
        ? { type: 'search', query: match[1].replace(/^['"]|['"]$/g, '') }
        : null;
    },
  },
  {
    name: 'theme',
    aliases: ['/theme light', '/theme dark'],
    sensitive: false,
    parse(input) {
      const match = input.match(/^\/theme (light|dark)$/);
      return match
        ? { type: 'theme', theme: match[1] as 'light' | 'dark' }
        : null;
    },
  },
  {
    name: 'login',
    aliases: ['/login username="<username>" password="<password>"'],
    sensitive: true,
    parse(input) {
      const match = input.match(
        /^\/login\s+username="([^"]+)"\s+password="([^"]+)"$/,
      );
      return match
        ? { type: 'login', username: match[1], password: match[2] }
        : null;
    },
  },
  {
    name: 'passwd',
    aliases: ['/passwd current="<old>" new="<new>"'],
    sensitive: true,
    parse(input) {
      const match = input.match(
        /^\/passwd\s+current="([^"]+)"\s+new="([^"]+)"$/,
      );
      return match
        ? { type: 'passwd', currentPassword: match[1], newPassword: match[2] }
        : null;
    },
  },
  {
    name: 'logout',
    aliases: ['/logout'],
    sensitive: false,
    parse: exact(['/logout'], { type: 'logout' }),
  },
  {
    name: 'help',
    aliases: ['help'],
    sensitive: false,
    parse: exact(['help'], { type: 'help' }),
  },
] as const;

export function parseCommand(raw: string) {
  const input = raw.trim();
  for (const definition of commandRegistry) {
    const action = definition.parse(input);
    if (action) return { definition, action };
  }
  return null;
}

export function redactCommand(raw: string) {
  const parsed = parseCommand(raw);
  if (!parsed?.definition.sensitive) return raw;
  if (parsed.action.type === 'login')
    return `/login username="${parsed.action.username}" password="••••••••"`;
  return '/passwd current="••••••••" new="••••••••"';
}

export const helpText = commandRegistry
  .map((command) => command.aliases[0])
  .join(' · ');
