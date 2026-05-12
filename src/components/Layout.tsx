import { ReactNode } from 'react';
import { Header } from './Header';
import { Rail } from './Rail';
import { Footer } from './Footer';

export function Layout({ children, activePage, setActivePage }: { children: ReactNode, activePage: string, setActivePage: (page: string) => void }) {
  return (
    <div className="flex flex-col h-screen bg-[color:var(--color-main)] text-[#ededed]">
      <Header activePage={activePage} setActivePage={setActivePage} />
      <div className="flex-1 flex overflow-hidden">
        <div className="hidden md:block">
          <Rail />
        </div>
        <main className="flex-1 overflow-auto p-3">{children}</main>
      </div>
      <Footer />
    </div>
  );
}
