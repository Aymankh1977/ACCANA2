/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useEffect, useRef } from 'react';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import type { SummaryChartData } from './AccreditationAnalyzer';
import './SummaryChartModal.css';

Chart.register(...registerables);

interface SummaryChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  chartConfig: SummaryChartData;
  accreditationBodyName: string;
}

const SummaryChartModal: React.FC<SummaryChartModalProps> = ({
  isOpen,
  onClose,
  chartConfig,
  accreditationBodyName,
}) => {
  const chartCanvasRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (isOpen && chartCanvasRef.current) {
      const ctx = chartCanvasRef.current.getContext('2d');
      if (ctx) {
        // Destroy existing chart instance if it exists
        if (chartInstanceRef.current) {
          chartInstanceRef.current.destroy();
        }

        // Create gradient for bars
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(0, 90, 156, 0.9)'); // Primary color
        gradient.addColorStop(1, 'rgba(0, 90, 156, 0.3)');

        const chartData: ChartConfiguration = {
          type: 'bar',
          data: {
            labels: chartConfig.labels,
            datasets: [
              {
                label: 'Match Percentage',
                data: chartConfig.dataValues,
                backgroundColor: gradient,
                borderColor: 'rgba(0, 90, 156, 1)',
                borderWidth: 1,
                borderRadius: 4,
                borderSkipped: false,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              title: {
                display: true,
                text: chartConfig.title,
                font: {
                  size: 18,
                  weight: 'bold',
                },
                color: '#005A9C',
              },
              legend: {
                display: false,
              },
              tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleColor: '#fff',
                bodyColor: '#fff',
                borderColor: 'rgba(0, 90, 156, 1)',
                borderWidth: 1,
                callbacks: {
                  label: function (context) {
                    return `Match: ${context.parsed.y}%`;
                  },
                },
              },
            },
            scales: {
              y: {
                beginAtZero: true,
                max: 100,
                ticks: {
                  callback: function (value) {
                    return value + '%';
                  },
                  stepSize: 20,
                },
                grid: {
                  color: 'rgba(0, 0, 0, 0.1)',
                },
              },
              x: {
                grid: {
                  display: false,
                },
                ticks: {
                  maxRotation: 45,
                  minRotation: 0,
                },
              },
            },
            animation: {
              duration: 1000,
              easing: 'easeInOutQuart',
            },
          },
        };

        chartInstanceRef.current = new Chart(ctx, chartData);
      }
    }

    // Cleanup function to destroy chart when component unmounts or modal closes
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [isOpen, chartConfig]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay summary-chart-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="summary-chart-title">
      <div className="modal-content summary-chart-modal-content">
        <header className="modal-header">
          <h3 id="summary-chart-title">
            {chartConfig.title}
          </h3>
          <button onClick={onClose} className="close-modal-button" aria-label="Close chart modal">
            <span className="icon">close</span>
          </button>
        </header>
        <div className="modal-body chart-modal-body">
          <div className="chart-container">
            <canvas ref={chartCanvasRef}></canvas>
          </div>
          <div className="chart-summary">
            <h4>Summary for {accreditationBodyName}</h4>
            <div className="summary-stats">
              <div className="stat-item">
                <span className="stat-label">Average Match:</span>
                <span className="stat-value">
                  {chartConfig.dataValues.length > 0
                    ? (
                        chartConfig.dataValues.reduce((a, b) => a + b, 0) /
                        chartConfig.dataValues.length
                      ).toFixed(1) + '%'
                    : 'N/A'}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Highest Match:</span>
                <span className="stat-value">
                  {chartConfig.dataValues.length > 0
                    ? Math.max(...chartConfig.dataValues) + '%'
                    : 'N/A'}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Lowest Match:</span>
                <span className="stat-value">
                  {chartConfig.dataValues.length > 0
                    ? Math.min(...chartConfig.dataValues) + '%'
                    : 'N/A'}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Standards Analyzed:</span>
                <span className="stat-value">{chartConfig.dataValues.length}</span>
              </div>
            </div>
          </div>
        </div>
        <footer className="modal-footer">
          <button onClick={onClose} className="action-button">
            Close
          </button>
        </footer>
      </div>
    </div>
  );
};

export default SummaryChartModal;