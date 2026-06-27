import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopHeader from './TopHeader';
import Dashboard from '../../pages/Dashboard';
import UrlAnalyzer from '../../pages/UrlAnalyzer';
import BatchPrediction from '../../pages/BatchPrediction';
import FeedbackCenter from '../../pages/FeedbackCenter';
import Report from '../../pages/Report';
import Settings from '../../pages/Settings';
import Profile from '../../pages/Profile';

const pages = [
  { path: '/dashboard', component: Dashboard },
  { path: '/url-analyzer', component: UrlAnalyzer },
  { path: '/batch-prediction', component: BatchPrediction },
  { path: '/feedback', component: FeedbackCenter },
  { path: '/report', component: Report },
  { path: '/settings', component: Settings },
  { path: '/profile', component: Profile },
];

export default function MainLayout() {
  const { pathname } = useLocation();

  return (
    <div className="flex h-screen bg-slate-900 text-white font-sans overflow-hidden">
      <Sidebar />

      <div className="flex flex-col flex-1 min-w-0">
        <TopHeader />

        <main className="flex-1 overflow-y-auto">
          {pages.map(({ path, component: Page }) => (
            <section
              key={path}
              className={pathname === path ? 'block min-h-full' : 'hidden'}
              aria-hidden={pathname !== path}
            >
              <Page />
            </section>
          ))}
        </main>
      </div>
    </div>
  );
}
