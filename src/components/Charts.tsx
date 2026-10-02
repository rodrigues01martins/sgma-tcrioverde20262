import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { fmt } from '../lib/utils';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface ChartsProps {
  categoryData: { labels: string[]; previsto: number[]; executado: number[] };
  groupData: { labels: string[]; previsto: number[]; executado: number[] };
  stageData: { labels: string[]; previsto: number[]; executado: number[] };
  monthData: { labels: string[]; executado: number[] };
}

export const Charts: React.FC<ChartsProps> = ({ categoryData, groupData, stageData, monthData }) => {
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const, labels: { font: { weight: 'bold' as any } } },
      tooltip: {
        backgroundColor: '#007770',
        callbacks: {
          label: (context: any) => `${context.dataset.label}: ${fmt.format(context.raw)}`
        }
      }
    },
    scales: {
      y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { callback: (value: any) => fmt.format(value) } },
      x: { grid: { display: false }, ticks: { font: { size: 10 } } }
    }
  };

  const createData = (labels: string[], previsto: number[], executado: number[], colors: string[]) => ({
    labels: labels.map(l => l.replace(/^\d+\.\s*/, '')),
    datasets: [
      { label: 'Previsto', data: previsto, backgroundColor: colors[0], borderRadius: 8 },
      { label: 'Executado', data: executado, backgroundColor: colors[1], borderRadius: 8 }
    ]
  });

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-slate-900 mb-6">Execução por Categoria</h3>
        <div className="h-64">
          <Bar options={options} data={createData(categoryData.labels, categoryData.previsto, categoryData.executado, ['#e2e8f0', '#007770'])} />
        </div>
      </div>
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-slate-900 mb-6">Execução por Grupo de Despesa</h3>
        <div className="h-64">
          <Bar options={options} data={createData(groupData.labels, groupData.previsto, groupData.executado, ['#fde68a', '#007770'])} />
        </div>
      </div>
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 xl:col-span-2">
        <h3 className="text-lg font-bold text-slate-900 mb-6">Execução por Etapa</h3>
        <div className="h-72">
          <Bar options={options} data={createData(stageData.labels, stageData.previsto, stageData.executado, ['#e2e8f0', '#007770'])} />
        </div>
      </div>
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 xl:col-span-2">
        <h3 className="text-lg font-bold text-slate-900 mb-6">Execução por Mês</h3>
        <div className="h-72">
          <Bar
            options={options}
            data={{
              labels: monthData.labels,
              datasets: [{ label: 'Executado no mês', data: monthData.executado, backgroundColor: '#FCD951', borderRadius: 8 }]
            }}
          />
        </div>
      </div>
    </div>
  );
};
