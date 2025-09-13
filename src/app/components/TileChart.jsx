import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { buildChartData } from '../../shared/utils';

const TileChart = ({ tasks, settings }) => {
  const data = buildChartData(tasks);
  if (data.length === 0) {
    return <div className="text-sm text-gray-400 mt-2">No dated tasks</div>;
  }
  return (
    <div className="w-full h-40 mt-2">
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="key" tickFormatter={(k) => k.split('-W')[1]} fontSize={10} />
          <YAxis fontSize={10} />
          <Tooltip
            labelFormatter={(label) => `Week ${label.split('-W')[1]}`}
            formatter={(value, name) => [value, name === 'done' ? 'Completed' : name === 'prio' ? 'High Priority' : name === 'nonPrio' ? 'Normal Priority' : 'Overdue']}
          />
          <Legend />
          <Bar dataKey="done" stackId="a" fill="#10B981" name="Completed" />
          <Bar dataKey="prio" stackId="a" fill="#EF4444" name="High Priority" />
          <Bar dataKey="nonPrio" stackId="a" fill="#3B82F6" name="Normal Priority" />
          <Bar dataKey="overdue" stackId="b" fill="#F59E0B" name="Overdue" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TileChart;
