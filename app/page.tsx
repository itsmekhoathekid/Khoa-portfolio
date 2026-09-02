import { PortfolioShell } from '@/src/features/portfolio/portfolio-shell';
import { getPublicPortfolio } from '@/src/server/content/public-queries';

export default async function Home() {
  const content = await getPublicPortfolio();
  return <PortfolioShell {...content} />;
}
