'use client';

import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts/core';
import { LineChart, BarChart, PieChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

// Register the required ECharts components
echarts.use([
  LineChart,
  BarChart,
  PieChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  CanvasRenderer,
]);

interface ClientChartProps {
  option: any;
  style?: React.CSSProperties;
  notMerge?: boolean;
  lazyUpdate?: boolean;
}

export default function ClientChart({
  option,
  style,
  notMerge = true,
  lazyUpdate = true,
}: ClientChartProps) {
  return (
    <ReactECharts
      option={option}
      style={style}
      notMerge={notMerge}
      lazyUpdate={lazyUpdate}
    />
  );
}
