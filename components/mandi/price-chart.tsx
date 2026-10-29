'use client'

import { useEffect, useRef } from 'react'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

export type HistoryPoint = { date: string; modal_price: number }

export function PriceChart({ data, fruit }: { data: HistoryPoint[]; fruit: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const divisor = fruit ? 100 : 1
    const unit = fruit ? 'kg' : 'Quintal'
    const chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: data.map((d) => d.date),
        datasets: [
          {
            label: `Modal Price (₹/${unit})`,
            data: data.map((d) => d.modal_price / divisor),
            borderColor: 'rgb(22, 163, 74)',
            backgroundColor: 'rgba(22, 163, 74, 0.1)',
            tension: 0.1,
            fill: true,
            pointRadius: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: false, ticks: { callback: (v) => '₹' + Number(v).toFixed(2) } },
          x: { ticks: { maxRotation: 45, minRotation: 45, autoSkip: true, maxTicksLimit: 10 } },
        },
      },
    })
    return () => chart.destroy()
  }, [data, fruit])

  return (
    <div className="relative h-64">
      <canvas ref={canvasRef} role="img" aria-label="Price trend chart" />
    </div>
  )
}
