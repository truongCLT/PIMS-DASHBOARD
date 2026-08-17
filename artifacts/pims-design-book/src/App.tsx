import { useState, useEffect } from 'react';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import ColorTokens from './sections/color-tokens';
import Typography from './sections/typography';
import ChartGallery from './sections/chart-gallery';
import CommonUI from './sections/common-ui';
import { ErrorBoundary } from '@/components/error-boundary';

function DesignBook() {
  const [activeId, setActiveId] = useState('color-tokens');

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setActiveId(entry.target.id);
        }
      });
    }, { rootMargin: '-20% 0px -80% 0px' });

    document.querySelectorAll('section[id]').forEach((section) => {
      observer.observe(section);
    });

    return () => observer.disconnect();
  }, []);

  const navItems = [
    { id: 'color-tokens', label: '컬러 토큰' },
    { id: 'typography', label: '타이포그래피' },
    { id: 'chart-gallery', label: '차트 갤러리' },
    { id: 'common-ui', label: '공통 UI' },
  ];

  return (
    <div className="flex min-h-[100dvh] bg-[#eef2f7] font-sans text-gray-900">
      <aside className="fixed left-0 top-0 h-screen w-[220px] bg-white border-r border-[#e2e9f3] py-8 flex flex-col z-10 shadow-sm overflow-y-auto">
        <div className="px-6 mb-8">
          <h1 className="text-[18px] font-bold text-[#16294a] leading-tight">
            PIMS Dashboard<br/>
            <span className="text-[#2f7cf6] text-[15px]">Design Book</span>
          </h1>
        </div>
        <nav className="flex flex-col px-3 gap-1">
          {navItems.map(item => (
            <a 
              key={item.id} 
              href={`#${item.id}`}
              className={`px-3 py-2 rounded-md text-[13px] font-semibold transition-colors ${activeId === item.id ? 'bg-[#eef2f7] text-[#2f7cf6]' : 'text-[#7c8ba3] hover:text-[#16294a] hover:bg-gray-50'}`}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </aside>
      
      <main className="ml-[220px] flex-1 p-8 lg:p-12 pb-32 overflow-y-auto" style={{ backgroundColor: '#eef2f7' }}>
         <div className="max-w-4xl mx-auto flex flex-col gap-16">
            <ColorTokens />
            <Typography />
            <ChartGallery />
            <CommonUI />
         </div>
      </main>
    </div>
  )
}

function Router() {
  return (
    <ErrorBoundary>
      <Switch>
        <Route path="/" component={DesignBook} />
        {/* Catch-all to redirect to home just in case */}
        <Route>
          <DesignBook />
        </Route>
      </Switch>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <Router />
    </WouterRouter>
  )
}
