import React, { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import './Dashboard.css'; // Importa los estilos del dashboard

// Plugin de Chart.js para mostrar el total en el centro de los gráficos de dona
const totalTicketsPlugin = {
    id: 'totalTicketsPlugin',
    beforeDraw: (chart) => {
        if (chart.config.type === 'doughnut') {
            const { ctx, width, height } = chart;
            ctx.restore();

            const total = chart.options.plugins.totalTicketsPlugin.total;
            if (total === undefined) return;

            const fontSize = (height / 114).toFixed(2);
            ctx.font = `bold ${fontSize}em 'Roboto', sans-serif`;
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#4A4A4A';

            const text = total.toString();
            const textMetrics = ctx.measureText(text);
            const textX = Math.round((width - textMetrics.width) / 2);
            const textY = height / 2;

            ctx.fillText(text, textX, textY);
            ctx.save();
        }
    }
};

// Registrar los plugins globalmente (o donde sea accesible para tus gráficos)
Chart.register(ChartDataLabels);
Chart.register(totalTicketsPlugin);

const Dashboard = () => {
    const [dashboardData, setDashboardData] = useState(null);

    // Referencias para los elementos canvas de los gráficos
    const statusChartRef = useRef(null);
    const severityChartRef = useRef(null);
    const categoryChartRef = useRef(null);
    const weeklyChartRef = useRef(null);

    // Datos simulados (reemplaza esto con tus llamadas a la API)
    const simulatedData = {
        kpis: {
            totalTickets: 305,
            openTickets: 75,
            closedTickets: 230,
            highSeverity: 15
        },
        ticketsByStatus: {
            labels: ['Abierto', 'En Progreso', 'Cerrado', 'Pendiente'],
            data: [75, 50, 150, 30],
            colors: ['#FF6384', '#FFCE56', '#4BC0C0', '#9966FF']
        },
        ticketsBySeverity: {
            labels: ['Crítica', 'Alta', 'Media', 'Baja'],
            data: [10, 15, 100, 180],
            colors: ['#FF0000', '#FF4500', '#FFD700', '#32CD32']
        },
        ticketsByCategory: {
            labels: ['Malware', 'Phishing', 'Acceso No Autorizado', 'DDoS', 'Vulnerabilidad'],
            data: [40, 60, 30, 20, 50],
            colors: ['#36A2EB', '#FF6384', '#4BC0C0', '#FFCE56', '#9966FF']
        },
        weeklyEvolution: {
            labels: ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4', 'Semana 5', 'Semana 6', 'Semana 7'],
            data: [10, 15, 25, 30, 20, 35, 40],
            colors: '#36A2EB'
        },
        topRecurrent: [
            { entity: '192.168.1.10', tickets: 25 },
            { entity: 'user@example.com', tickets: 18 },
            { entity: 'Servidor Web 01', tickets: 12 },
            { entity: 'Firewall Principal', tickets: 10 },
            { entity: 'Endpoint RH', tickets: 8 },
            { entity: '10.0.0.5', tickets: 7 },
            { entity: 'user2@example.com', tickets: 6 },
            { entity: 'Servidor DB 03', tickets: 5 },
            { entity: 'Router Borde', tickets: 4 },
            { entity: 'Endpoint Ventas', tickets: 3 }
        ]
    };

    // Función para crear gráficos de dona
    const createDoughnutChart = (chartRef, labels, data, colors, total) => {
        if (!chartRef.current) return;
        if (chartRef.current.chart) { // Destruir gráfico existente si lo hay
            chartRef.current.chart.destroy();
        }
        const ctx = chartRef.current.getContext('2d');
        chartRef.current.chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderColor: '#ffffff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: {
                                family: 'Roboto, sans-serif'
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed !== null) {
                                    label += context.parsed + ' (' + ((context.parsed / total) * 100).toFixed(1) + '%)';
                                }
                                return label;
                            }
                        },
                        bodyFont: {
                            family: 'Roboto, sans-serif'
                        },
                        titleFont: {
                            family: 'Roboto, sans-serif'
                        }
                    },
                    totalTicketsPlugin: { total: total }
                }
            }
        });
    };

    // Función para crear gráficos de barras
    const createBarChart = (chartRef, labels, data, colors) => {
        if (!chartRef.current) return;
        if (chartRef.current.chart) {
            chartRef.current.chart.destroy();
        }
        const ctx = chartRef.current.getContext('2d');
        chartRef.current.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Número de Tickets',
                    data: data,
                    backgroundColor: colors,
                    borderColor: colors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            font: {
                                family: 'Roboto, sans-serif'
                            }
                        }
                    },
                    x: {
                        ticks: {
                            font: {
                                family: 'Roboto, sans-serif'
                            }
                        }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        bodyFont: {
                            family: 'Roboto, sans-serif'
                        },
                        titleFont: {
                            family: 'Roboto, sans-serif'
                        }
                    }
                }
            }
        });
    };

    // Función para crear gráficos de línea
    const createLineChart = (chartRef, labels, data, color) => {
        if (!chartRef.current) return;
        if (chartRef.current.chart) {
            chartRef.current.chart.destroy();
        }
        const ctx = chartRef.current.getContext('2d');
        chartRef.current.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Tickets',
                    data: data,
                    borderColor: color,
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            font: {
                                family: 'Roboto, sans-serif'
                            }
                        }
                    },
                    x: {
                        ticks: {
                            font: {
                                family: 'Roboto, sans-serif'
                            }
                        }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        bodyFont: {
                            family: 'Roboto, sans-serif'
                        },
                        titleFont: {
                            family: 'Roboto, sans-serif'
                        }
                    }
                }
            }
        });
    };

    useEffect(() => {
        // Aquí es donde harías tus llamadas a la API para obtener los datos reales
        // Por ejemplo:
        // const fetchDashboardData = async () => {
        //     const kpis = await api.getKpis(); // Asumiendo que tienes un api.js
        //     const statusData = await api.getTicketsByStatus();
        //     // ... y así sucesivamente
        //     setDashboardData({ kpis, ticketsByStatus: statusData, ... });
        // };
        // fetchDashboardData();

        // Usando datos simulados por ahora
        setDashboardData(simulatedData);
    }, []);

    useEffect(() => {
        if (dashboardData) {
            // Inicializar gráficos cuando los datos estén disponibles
            createDoughnutChart(statusChartRef, dashboardData.ticketsByStatus.labels, dashboardData.ticketsByStatus.data, dashboardData.ticketsByStatus.colors, dashboardData.kpis.totalTickets);
            createDoughnutChart(severityChartRef, dashboardData.ticketsBySeverity.labels, dashboardData.ticketsBySeverity.data, dashboardData.ticketsBySeverity.colors, dashboardData.kpis.totalTickets);
            createBarChart(categoryChartRef, dashboardData.ticketsByCategory.labels, dashboardData.ticketsByCategory.data, dashboardData.ticketsByCategory.colors);
            createLineChart(weeklyChartRef, dashboardData.weeklyEvolution.labels, dashboardData.weeklyEvolution.data, dashboardData.weeklyEvolution.colors);
        }
    }, [dashboardData]); // Re-ejecutar cuando dashboardData cambie

    return (
        <div className="dashboard-container">
            <h1 className="dashboard-title">Panel de Control SOC</h1>

            {/* Sección de KPIs */}
            <div className="kpi-grid">
                <div className="kpi-card">
                    <div className="kpi-value">{dashboardData?.kpis.totalTickets || 0}</div>
                    <div className="kpi-label">Total de Tickets</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-value">{dashboardData?.kpis.openTickets || 0}</div>
                    <div className="kpi-label">Tickets Abiertos</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-value">{dashboardData?.kpis.closedTickets || 0}</div>
                    <div className="kpi-label">Tickets Cerrados (24h)</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-value">{dashboardData?.kpis.highSeverity || 0}</div>
                    <div className="kpi-label">Severidad Alta</div>
                </div>
            </div>

            {/* Grid para las gráficas y la tabla */}
            <div className="charts-grid">
                {/* Tarjeta: Tickets por Estado (Dona) */}
                <div className="card chart-card card--estado">
                    <h2 className="card-title">Tickets por Estado</h2>
                    <div className="chart-container">
                        <canvas ref={statusChartRef}></canvas>
                    </div>
                </div>

                {/* Tarjeta: Tickets por Severidad (Dona) */}
                <div className="card chart-card card--severidad">
                    <h2 className="card-title">Tickets por Severidad</h2>
                    <div className="chart-container">
                        <canvas ref={severityChartRef}></canvas>
                    </div>
                </div>

                {/* Tarjeta: Tickets por Categoría (Barras) */}
                <div className="card chart-card card--categoria">
                    <h2 className="card-title">Tickets por Categoría</h2>
                    <div className="chart-container">
                        <canvas ref={categoryChartRef}></canvas>
                    </div>
                </div>

                {/* Tarjeta: Evolución Semanal de Tickets (Línea) */}
                <div className="card chart-card card--evolucion">
                    <h2 className="card-title">Evolución Semanal de Tickets</h2>
                    <div className="chart-container">
                        <canvas ref={weeklyChartRef}></canvas>
                    </div>
                </div>

                {/* Tarjeta: Top 10 Dispositivos/Usuarios Recurrentes (Tabla) */}
                <div className="card table-card card--top10">
                    <h2 className="card-title">Top 10 Dispositivos/Usuarios Recurrentes</h2>
                    <div className="table-responsive">
                        <table id="topRecurrentTable">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Entidad</th>
                                    <th>Tickets</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dashboardData?.topRecurrent.map((item, index) => (
                                    <tr key={index}>
                                        <td>{index + 1}</td>
                                        <td>{item.entity}</td>
                                        <td>{item.tickets}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
