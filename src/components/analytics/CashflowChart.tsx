import React, { useMemo } from 'react';
import { TrendingUp, ArrowDownRight, ArrowUpRight, Percent } from 'lucide-react';
import type { TransactionWithEntries } from '@/lib/api/transactions';
import { formatINR } from '@/lib/accounting/currency';

interface CashflowChartProps {
  transactions: TransactionWithEntries[];
}

interface MonthlyCashflow {
  monthKey: string; // '2026-10'
  monthLabel: string; // 'Oct 2026'
  incomePaise: bigint;
  expensePaise: bigint;
  netSavingsPaise: bigint;
  savingsRate: number;
}

export const CashflowChart: React.FC<CashflowChartProps> = ({ transactions }) => {
  const [activeMonthKey, setActiveMonthKey] = React.useState<string | null>(null);

  const monthlyData = useMemo<MonthlyCashflow[]>(() => {
    const map = new Map<string, { income: bigint; expense: bigint }>();

    transactions.forEach((tx) => {
      const monthKey = tx.transactionDate.slice(0, 7); // 'YYYY-MM'
      const cur = map.get(monthKey) || { income: 0n, expense: 0n };

      if (tx.type === 'income') {
        cur.income += tx.totalAmountPaise;
      } else if (tx.type === 'expense') {
        cur.expense += tx.totalAmountPaise;
      }

      map.set(monthKey, cur);
    });

    // Ensure current month is present even if empty
    const currentMonthKey = new Date().toISOString().slice(0, 7);
    if (!map.has(currentMonthKey)) {
      map.set(currentMonthKey, { income: 0n, expense: 0n });
    }

    const sortedKeys = Array.from(map.keys()).sort();
    // Keep at most last 6 months
    const recentKeys = sortedKeys.slice(-6);

    return recentKeys.map((key) => {
      const { income, expense } = map.get(key)!;
      const net = income - expense;
      const rate = income > 0n ? Number(((income - expense) * 10000n) / income) / 100 : 0;

      const [year, month] = key.split('-');
      const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1);
      const label = dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      return {
        monthKey: key,
        monthLabel: label,
        incomePaise: income,
        expensePaise: expense,
        netSavingsPaise: net,
        savingsRate: rate,
      };
    });
  }, [transactions]);

  // Aggregate current active totals
  const currentMonth = monthlyData[monthlyData.length - 1] || {
    incomePaise: 0n,
    expensePaise: 0n,
    netSavingsPaise: 0n,
    savingsRate: 0,
    monthLabel: 'Current Month',
  };

  // Find max value to normalize bar heights
  const maxVal = useMemo(() => {
    let max = 1n;
    monthlyData.forEach((m) => {
      if (m.incomePaise > max) max = m.incomePaise;
      if (m.expensePaise > max) max = m.expensePaise;
    });
    return max;
  }, [monthlyData]);

  return (
    <div className="glass-card rounded-2xl border border-white/10 p-5 space-y-5 max-w-full overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-semibold text-white">Monthly Cashflow & Savings Rate</h4>
          </div>
          <p className="text-xs text-neutral-400">
            Realized cash inflows vs expenses across active budget periods
          </p>
        </div>

        {/* Current Month Quick Metrics */}
        <div className="flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
            <span className="text-neutral-400">Income</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" />
            <span className="text-neutral-400">Expense</span>
          </div>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 xs:grid-cols-3 gap-2 sm:gap-3 p-3.5 rounded-xl bg-neutral-900/60 border border-white/5">
        <div>
          <div className="text-[11px] text-neutral-400 flex items-center space-x-1">
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
            <span>Monthly Inflow</span>
          </div>
          <div className="text-sm sm:text-base font-bold font-mono text-emerald-400 mt-0.5 truncate">
            {formatINR(currentMonth.incomePaise)}
          </div>
        </div>
        <div>
          <div className="text-[11px] text-neutral-400 flex items-center space-x-1">
            <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
            <span>Monthly Outflow</span>
          </div>
          <div className="text-sm sm:text-base font-bold font-mono text-rose-400 mt-0.5 truncate">
            {formatINR(currentMonth.expensePaise)}
          </div>
        </div>
        <div>
          <div className="text-[11px] text-neutral-400 flex items-center space-x-1">
            <Percent className="w-3.5 h-3.5 text-sky-400" />
            <span>Savings Rate</span>
          </div>
          <div
            className={`text-sm sm:text-base font-bold font-mono mt-0.5 truncate ${
              currentMonth.savingsRate >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {currentMonth.savingsRate.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Interactive Bar Chart Visualization */}
      <div className="space-y-2 pt-2">
        <div className="h-44 flex items-end justify-between gap-1.5 sm:gap-4 md:gap-8 px-1 sm:px-2 border-b border-white/5 pb-2">
          {monthlyData.map((m) => {
            const incomeHeight =
              maxVal > 0n ? Math.max(8, Number((m.incomePaise * 100n) / maxVal)) : 8;
            const expenseHeight =
              maxVal > 0n ? Math.max(8, Number((m.expensePaise * 100n) / maxVal)) : 8;
            const isSelected = activeMonthKey === m.monthKey;

            return (
              <div
                key={m.monthKey}
                onClick={() => setActiveMonthKey(isSelected ? null : m.monthKey)}
                className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative"
              >
                {/* Tooltip on hover / tap */}
                <div
                  className={`transition-opacity duration-200 pointer-events-none mb-2 text-[10px] bg-neutral-900 border border-white/10 rounded-lg p-2 shadow-xl text-center space-y-0.5 whitespace-nowrap z-20 absolute bottom-full ${
                    isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}
                >
                  <div className="font-semibold text-white">{m.monthLabel}</div>
                  <div className="text-emerald-400 font-mono">In: {formatINR(m.incomePaise)}</div>
                  <div className="text-rose-400 font-mono">Out: {formatINR(m.expensePaise)}</div>
                  <div className="text-sky-400 font-mono">Rate: {m.savingsRate.toFixed(1)}%</div>
                </div>

                {/* Bars side by side */}
                <div className="w-full flex items-end justify-center space-x-1 sm:space-x-2 md:space-x-3 h-full">
                  {/* Income bar */}
                  <div
                    className="w-1/2 max-w-[24px] bg-emerald-500/80 hover:bg-emerald-400 rounded-t-md transition-all duration-500 shadow-lg shadow-emerald-500/10"
                    style={{ height: `${incomeHeight}%` }}
                    title={`Income: ${formatINR(m.incomePaise)}`}
                  />
                  {/* Expense bar */}
                  <div
                    className="w-1/2 max-w-[24px] bg-rose-500/80 hover:bg-rose-400 rounded-t-md transition-all duration-500 shadow-lg shadow-rose-500/10"
                    style={{ height: `${expenseHeight}%` }}
                    title={`Expense: ${formatINR(m.expensePaise)}`}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* X-axis labels */}
        <div className="flex items-center justify-between gap-1.5 sm:gap-4 md:gap-8 px-1 sm:px-2 text-[10px] font-mono text-neutral-400">
          {monthlyData.map((m) => (
            <div
              key={m.monthKey}
              onClick={() => setActiveMonthKey(activeMonthKey === m.monthKey ? null : m.monthKey)}
              className={`flex-1 text-center truncate cursor-pointer transition ${
                activeMonthKey === m.monthKey ? 'text-sky-300 font-bold' : 'hover:text-white'
              }`}
            >
              {m.monthLabel}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
