import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './layout/AppLayout';
import { DashboardScreen } from './screens/DashboardScreen';
import { WeeklyPlannerScreen } from './screens/WeeklyPlannerScreen';
import { HabitsScreen } from './screens/HabitsScreen';
import { FinanceScreen } from './screens/FinanceScreen';
import { GoalsScreen } from './screens/GoalsScreen';
import { StatisticsScreen } from './screens/StatisticsScreen';

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<DashboardScreen />} />
        <Route path="weekly-planner" element={<WeeklyPlannerScreen />} />
        <Route path="habits" element={<HabitsScreen />} />
        <Route path="finance" element={<FinanceScreen />} />
        <Route path="goals" element={<GoalsScreen />} />
        <Route path="statistics" element={<StatisticsScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
