/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { MatchAnalyzer } from './pages/MatchAnalyzer';
import { SlipBuilder } from './pages/SlipBuilder';
import { LiveTracker } from './pages/LiveTracker';
import { History } from './pages/History';
import { Admin } from './pages/Admin';

export default function App() {
  const [activePage, setActivePage] = useState('PRO DASHBOARD');

  const renderPage = () => {
    switch (activePage) {
      case 'PRO DASHBOARD': return <Dashboard />;
      case 'ANALYZER': return <MatchAnalyzer />;
      case 'LIVE TRACKER': return <LiveTracker />;
      case 'ANALYSIS HISTORY': return <History />;
      case 'SLIP BUILDER': return <SlipBuilder />;
      case 'ADMIN': return <Admin />;
      default: return <Dashboard />;
    }
  };

  return (
    <Layout activePage={activePage} setActivePage={setActivePage}>
      {renderPage()}
    </Layout>
  );
}

