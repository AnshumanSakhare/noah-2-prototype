import { Suspense } from 'react';
import { 
  getDashboardStats,
  getLocalizationParity, 
  getLocalizedBreakdowns, 
  getComparisonData 
} from './queries';
import { 
  Globe2, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight,
  Database,
  BarChart2,
  Layers,
  LayoutGrid,
  Info
} from 'lucide-react';
import Link from 'next/link';

// Vertical Bar Chart Component (supports grouped bars)
function VerticalBarChart({ 
  title, 
  groups, 
  view = 'overall' 
}: { 
  title: string, 
  groups: { label: string, bars: { label: string, count: number, color: string }[] }[], 
  view?: 'overall' | 'regional' 
}) {
  // Find max count across all groups and bars to scale
  const allCounts = groups.flatMap(g => g.bars.map(b => b.count));
  const max = Math.max(...allCounts, 1);

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <BarChart2 size={18} className="text-slate-400" />
          {title}
        </h3>
        {view === 'regional' && (
          <div className="flex gap-2">
             {['US', 'UK', 'ON', 'UAE', 'AU'].map((r, i) => (
               <div key={r} className="flex items-center gap-1">
                 <div className={`w-1.5 h-1.5 rounded-full ${[
                    'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-indigo-500'
                  ][i]}`} />
                 <span className="text-[8px] font-bold text-slate-400">{r}</span>
               </div>
             ))}
          </div>
        )}
      </div>
      
      <div className="h-64 flex items-end justify-around gap-2 px-2 pb-8 border-b border-slate-100">
        {groups.map((group, i) => (
          <div key={i} className="flex-1 flex flex-col items-center h-full justify-end group/group relative">
            {/* Bars Container */}
            <div className="flex items-end gap-0.5 w-full h-full justify-center">
              {group.bars.map((bar, j) => (
                <div 
                  key={j}
                  className={`flex-1 ${bar.color} rounded-t-sm transition-all duration-500 ease-out group-hover:brightness-110 relative group/bar`}
                  style={{ height: `${(bar.count / max) * 100}%`, minWidth: view === 'overall' ? '12px' : '4px' }}
                >
                   {/* Tooltip */}
                   <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover/bar:opacity-100 transition-opacity bg-slate-800 text-white text-[8px] py-0.5 px-1 rounded whitespace-nowrap z-10 pointer-events-none">
                    {bar.label}: {bar.count}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Group Label */}
            <div className="absolute -bottom-7 w-full text-center">
              <span className="text-[9px] font-bold text-slate-500 truncate block px-0.5 group-hover/group:text-slate-900 transition-colors uppercase tracking-tighter">
                {group.label}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function RegionalQuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string, view?: 'overall' | 'regional' }>;
}) {
  const params = await searchParams;
  const currentPage = parseInt(params.page || '1');
  const chartView = params.view || 'overall';
  const limit = 10;

  // Fetch data in parallel
  const [
    stats,
    parity, 
    breakdowns, 
    comparisonData
  ] = await Promise.all([
    getDashboardStats(),
    getLocalizationParity(),
    getLocalizedBreakdowns(),
    getComparisonData(currentPage, limit),
  ]);

  const { total: totalCount, globalCount, localizedTotal: localizedCount, perCountry } = stats;

  const parityPercentage = parity.total_us > 0 
    ? Math.round((parity.fully_localized / parity.total_us) * 100) 
    : 0;

  const targetRegions = ['US', 'UK', 'Ontario', 'UAE', 'Australia'];
  const regionColors: Record<string, string> = {
    'US': 'bg-blue-500',
    'UK': 'bg-emerald-500',
    'Ontario': 'bg-amber-500',
    'UAE': 'bg-rose-500',
    'Australia': 'bg-indigo-500'
  };

  const chartColors = [
    'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 
    'bg-indigo-500', 'bg-violet-500', 'bg-cyan-500', 'bg-orange-500'
  ];

  // Helper to process chart data
  const processChartData = (raw: any[], key: string) => {
    if (chartView === 'overall') {
      const agg = raw.reduce((acc: any, curr: any) => {
        acc[curr[key]] = (acc[curr[key]] || 0) + parseInt(curr.count);
        return acc;
      }, {});
      // Return top 8
      return Object.entries(agg)
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, 8)
        .map(([label, count], i) => ({
          label,
          bars: [{ label, count: count as number, color: chartColors[i % chartColors.length] }]
        }));
    } else {
      // Group by Grade/Type, show sub-bars for regions
      const grouped: Record<string, any> = {};
      raw.forEach(d => {
        if (!grouped[d[key]]) grouped[d[key]] = [];
        grouped[d[key]].push({ label: d.region, count: parseInt(d.count), color: regionColors[d.region] || 'bg-slate-500' });
      });
      
      return Object.entries(grouped)
        .slice(0, 8) // only 8 grades/types
        .map(([label, bars]) => ({
          label,
          bars: (bars as any[]).sort((a, b) => targetRegions.indexOf(a.label) - targetRegions.indexOf(b.label))
        }));
    }
  };

  const gradeGroups = processChartData(breakdowns.byGrade, 'grade');
  const typeGroups = processChartData(breakdowns.byType, 'type');

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Globe2 className="text-blue-600" size={28} />
              Regional Content Dashboard
            </h1>
            <p className="text-slate-500 text-sm font-medium mt-1">
              Database health and localization metrics overview.
            </p>
          </div>
          <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2 group">
            <Database size={18} className="text-slate-400" />
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-tight">
              final_content_questions_1
            </span>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Questions */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative group overflow-hidden">
            <h3 className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Total Questions</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900">{totalCount.toLocaleString()}</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 font-medium">Database-wide count</p>
          </div>

          {/* Global Questions */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative group overflow-hidden">
            <h3 className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Global Questions</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900">{globalCount.toLocaleString()}</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 font-medium">Non-regional content</p>
          </div>

          {/* Localization Questions (Includes US) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative group overflow-hidden">
            <h3 className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Regional Questions</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900">{localizedCount.toLocaleString()}</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 border-t border-slate-50 pt-2">
              {targetRegions.map(region => (
                <div key={region} className="flex justify-between items-center text-[9px]">
                  <span className="text-slate-400 font-bold uppercase tracking-tighter">{region}</span>
                  <span className="text-slate-700 font-bold">{(perCountry[region] || 0).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Localization % Complete */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative group overflow-hidden">
            <h3 className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Localization %</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900">{parityPercentage}%</span>
              <span className="text-xs text-emerald-500 font-bold">Complete</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 font-medium">
              {parity.fully_localized} of {parity.total_us} US masters
            </p>
          </div>
        </div>

        {/* Database Insights with Toggle */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <BarChart2 className="text-blue-600" size={20} />
              <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Database Insights (Regional Breakdown)</h2>
            </div>
            
            {/* View Toggle */}
            <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
              <Link
                href={`?page=${currentPage}&view=overall`}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                  chartView === 'overall' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Overall
              </Link>
              <Link
                href={`?page=${currentPage}&view=regional`}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                  chartView === 'regional' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Per Country
              </Link>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <VerticalBarChart 
              title={chartView === 'overall' ? "Grade Distribution (Overall)" : "Regional Grade Breakdown (Grouped)"} 
              groups={gradeGroups}
              view={chartView}
            />
            <VerticalBarChart 
              title={chartView === 'overall' ? "Type Distribution (Overall)" : "Regional Type Breakdown (Grouped)"} 
              groups={typeGroups}
              view={chartView}
            />
          </div>
        </div>

        {/* Regional Comparison */}
        <div className="space-y-6 pt-6 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Regional Comparison</h2>
            <div className="bg-slate-800 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold tabular-nums">
               {((currentPage - 1) * limit) + 1} — {Math.min(currentPage * limit, comparisonData.total)} OF {comparisonData.total}
            </div>
          </div>

          <div className="space-y-4">
            {comparisonData.questions.map((q: any) => (
              <div key={q.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:border-blue-300 transition-colors group">
                <div className="px-5 py-3 bg-slate-900 text-white flex items-center justify-between">
                  <div className="flex items-center gap-3 text-[10px] font-bold">
                    <span className="px-2 py-0.5 bg-blue-600 rounded text-white uppercase tracking-tighter">US Master</span>
                    <span className="text-slate-400">|</span>
                    <span className="text-blue-100">{q.subject}</span>
                    <span className="text-slate-500">•</span>
                    <span>{q.grade}</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-300 truncate max-w-[200px]">{q.topic}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">ID: {q.id.slice(0, 8)}</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
                  <div className="p-5 bg-blue-50/20">
                    <div className="text-[10px] font-bold text-blue-600 uppercase mb-3 tracking-widest flex items-center gap-1.5">
                      <div className="h-1 w-1 bg-blue-600 rounded-full" />
                      United States
                    </div>
                    <div className="space-y-4">
                      <div>
                        <div className="text-[9px] text-slate-400 font-bold uppercase mb-1">Content</div>
                        <p className="text-sm text-slate-800 line-clamp-5 leading-relaxed font-medium">{q.question_text}</p>
                      </div>
                      <div>
                        <div className="text-[9px] text-slate-400 font-bold uppercase mb-1">Explanation</div>
                        <p className="text-[12px] text-slate-500 italic leading-relaxed border-l-2 border-blue-100 pl-3">
                          {q.explanation || 'No explanation'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {['UK', 'Ontario', 'UAE', 'Australia'].map(region => {
                    const variant = q.regionalVersions[region];
                    return (
                      <div key={region} className="p-5 hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-center justify-between mb-3 border-b border-slate-50 pb-2">
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{region}</div>
                          {variant ? (
                            <CheckCircle2 size={14} className="text-emerald-500" />
                          ) : (
                            <span className="text-[8px] text-amber-500 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">MISSING</span>
                          )}
                        </div>
                        {variant ? (
                          <div className="space-y-4">
                            <div>
                              <div className="text-[9px] text-slate-400 font-bold uppercase mb-1">Local</div>
                              <p className="text-[13px] text-slate-700 line-clamp-5 leading-relaxed">{variant.question_text}</p>
                            </div>
                            <div>
                              <div className="text-[9px] text-slate-400 font-bold uppercase mb-1">Rational</div>
                              <p className="text-[12px] text-slate-500 italic leading-relaxed border-l-2 border-slate-200 pl-3">
                                {variant.explanation || 'No explanation'}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center py-12 opacity-30">
                            <Database size={24} className="text-slate-300 mb-2" />
                            <span className="text-[9px] text-slate-400 italic font-bold uppercase">Pending</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-4 pt-6 pb-12">
            <Link
              href={`?page=${Math.max(1, currentPage - 1)}&view=${chartView}`}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold transition-all shadow-sm ${
                currentPage === 1 ? 'opacity-40 cursor-not-allowed' : 'hover:border-blue-600 hover:text-blue-600 text-slate-700'
              }`}
            >
              <ChevronLeft size={16} />
              PREV
            </Link>
            <div className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 shadow-sm">
              PAGE {currentPage}
            </div>
            <Link
              href={`?page=${currentPage + 1}&view=${chartView}`}
              className={`flex items-center gap-3 px-6 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold transition-all shadow-sm ${
                currentPage * limit >= comparisonData.total ? 'opacity-40 cursor-not-allowed' : 'hover:border-blue-600 hover:text-blue-600 text-slate-700'
              }`}
            >
              NEXT
              <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
