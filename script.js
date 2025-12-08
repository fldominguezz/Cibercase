// script.js

// --- Configuración General ---
// Colores profesionales y suaves para los gráficos
const CHART_COLORS = {
    blue: '#007ACC',    // Azul primario
    green: '#2E8B57',   // Verde éxito
    orange: '#E67E22',  // Naranja advertencia
    red: '#E74C3C',     // Rojo peligro
    gray: '#BDC3C7',    // Gris neutro
    lightBlue: '#6BB9F0', // Azul claro
    lightGreen: '#87D37C', // Verde claro
    lightOrange: '#F4B350', // Naranja claro
    lightRed: '#F1A9A0', // Rojo claro
    darkGray: '#6C7A89' // Gris oscuro
};

// Registrar el plugin datalabels de Chart.js
Chart.register(ChartDataLabels);

// --- Funciones para Generar Datos Simulados ---
// En un entorno real, estas funciones harían llamadas a tu API de backend (Flask/Node)
// Por ejemplo:
// async function fetchTotalTickets() {
//     const response = await fetch('/api/total_tickets');
//     const data = await response.json();
//     return data.count;
// }

function generateSimulatedData() {
    const totalTickets = Math.floor(Math.random() * 500) + 200; // Entre 200 y 700
    const assignedTickets = Math.floor(Math.random() * totalTickets * 0.6) + 50; // Hasta 60% del total

    const statusData = {
        'Nuevo': Math.floor(Math.random() * totalTickets * 0.3),
        'Asignado': Math.floor(Math.random() * totalTickets * 0.2),
        'En Progreso': Math.floor(Math.random() * totalTickets * 0.25),
        'Resuelto': Math.floor(Math.random() * totalTickets * 0.15),
        'Cerrado': Math.floor(Math.random() * totalTickets * 0.1),
    };
    // Ajustar para que la suma sea el total de tickets
    let sumStatus = Object.values(statusData).reduce((a, b) => a + b, 0);
    if (sumStatus < totalTickets) {
        statusData['Nuevo'] += (totalTickets - sumStatus);
    } else if (sumStatus > totalTickets) {
        // Distribuir la diferencia negativamente si excede
        let diff = sumStatus - totalTickets;
        for (let key in statusData) {
            if (statusData[key] > diff) {
                statusData[key] -= diff;
                diff = 0;
                break;
            }
        }
    }


    const severityData = {
        'Crítica': Math.floor(Math.random() * totalTickets * 0.05),
        'Alta': Math.floor(Math.random() * totalTickets * 0.15),
        'Media': Math.floor(Math.random() * totalTickets * 0.3),
        'Baja': Math.floor(Math.random() * totalTickets * 0.5),
    };
    // Ajustar para que la suma sea el total de tickets
    let sumSeverity = Object.values(severityData).reduce((a, b) => a + b, 0);
    if (sumSeverity < totalTickets) {
        severityData['Baja'] += (totalTickets - sumSeverity);
    } else if (sumSeverity > totalTickets) {
        let diff = sumSeverity - totalTickets;
        for (let key in severityData) {
            if (severityData[key] > diff) {
                severityData[key] -= diff;
                diff = 0;
                break;
            }
        }
    }


    const categoryData = {
        'Red': Math.floor(Math.random() * totalTickets * 0.2),
        'Seguridad': Math.floor(Math.random() * totalTickets * 0.25),
        'Servidores': Math.floor(Math.random() * totalTickets * 0.15),
        'Aplicaciones': Math.floor(Math.random() * totalTickets * 0.1),
        'Endpoint': Math.floor(Math.random() * totalTickets * 0.1),
        'Cloud': Math.floor(Math.random() * totalTickets * 0.05),
        'Otros': Math.floor(Math.random() * totalTickets * 0.15),
    };

    const weeklyEvolutionData = Array.from({ length: 8 }, (_, i) => ({
        week: `Semana ${i + 1}`,
        tickets: Math.floor(Math.random() * 100) + 50 // Entre 50 y 150 tickets por semana
    }));

    const avgResolutionTime = `${Math.floor(Math.random() * 48) + 12}h`; // Entre 12 y 60 horas
    const avgResponseTime = `${Math.floor(Math.random() * 8) + 1}h`; // Entre 1 y 9 horas

    const topRecurring = Array.from({ length: 10 }, (_, i) => ({
        name: `Dispositivo/Usuario ${i + 1}`,
        count: Math.floor(Math.random() * 30) + 5
    })).sort((a, b) => b.count - a.count);

    return {
        totalTickets,
        assignedTickets,
        statusData,
        severityData,
        categoryData,
        weeklyEvolutionData,
        avgResolutionTime,
        avgResponseTime,
        topRecurring
    };
}

// --- Opciones Comunes para Gráficos ---
const commonChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            position: 'right', // Posición de la leyenda para gráficos de dona
            labels: {
                font: {
                    size: 12
                },
                color: CHART_COLORS.darkGray
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
                        label += context.formattedValue;
                        if (context.chart.data.datasets[0].data.length > 1) { // Solo si hay más de un segmento
                            const total = context.dataset.data.reduce((sum, val) => sum + val, 0);
                            const percentage = (context.parsed / total * 100).toFixed(1);
                            label += ` (${percentage}%)`;
                        }
                    }
                    return label;
                }
            }
        },
        datalabels: { // Configuración para mostrar valores en los segmentos de la dona
            color: '#fff',
            formatter: (value, ctx) => {
                const total = ctx.chart.data.datasets[0].data.reduce((sum, val) => sum + val, 0);
                const percentage = (value / total * 100).toFixed(0) + '%';
                return percentage;
            },
            font: {
                weight: 'bold',
                size: 10
            }
        }
    }
};

// --- Inicialización y Renderizado de Gráficos ---
function renderCharts(data) {
    // Gráfico de Tickets por Estado (Dona)
    const statusCtx = document.getElementById('statusChart').getContext('2d');
    new Chart(statusCtx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(data.statusData),
            datasets: [{
                data: Object.values(data.statusData),
                backgroundColor: [
                    CHART_COLORS.blue,
                    CHART_COLORS.lightBlue,
                    CHART_COLORS.orange,
                    CHART_COLORS.green,
                    CHART_COLORS.gray
                ],
                borderColor: '#fff',
                borderWidth: 2
            }]
        },
        options: {
            ...commonChartOptions,
            plugins: {
                ...commonChartOptions.plugins,
                legend: {
                    position: 'right'
                }
            }
        }
    });

    // Gráfico de Tickets por Severidad (Dona)
    const severityCtx = document.getElementById('severityChart').getContext('2d');
    new Chart(severityCtx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(data.severityData),
            datasets: [{
                data: Object.values(data.severityData),
                backgroundColor: [
                    CHART_COLORS.red,
                    CHART_COLORS.orange,
                    CHART_COLORS.warningOrange, // Usar un naranja diferente o más claro para Media
                    CHART_COLORS.green,
                    CHART_COLORS.gray
                ],
                borderColor: '#fff',
                borderWidth: 2
            }]
        },
        options: {
            ...commonChartOptions,
            plugins: {
                ...commonChartOptions.plugins,
                legend: {
                    position: 'right'
                }
            }
        }
    });

    // Gráfico de Tickets por Categoría (Barras)
    const categoryCtx = document.getElementById('categoryChart').getContext('2d');
    new Chart(categoryCtx, {
        type: 'bar',
        data: {
            labels: Object.keys(data.categoryData),
            datasets: [{
                label: 'Número de Tickets',
                data: Object.values(data.categoryData),
                backgroundColor: CHART_COLORS.blue,
                borderColor: CHART_COLORS.darkGray,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false // No mostrar leyenda para barras si solo hay un dataset
                },
                tooltip: commonChartOptions.plugins.tooltip,
                datalabels: { // Mostrar valores en las barras
                    color: CHART_COLORS.darkGray,
                    anchor: 'end',
                    align: 'top',
                    formatter: (value) => value,
                    font: {
                        weight: 'bold',
                        size: 10
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: CHART_COLORS.darkGray
                    },
                    grid: {
                        color: CHART_COLORS.lightGray
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: CHART_COLORS.darkGray
                    },
                    grid: {
                        color: CHART_COLORS.lightGray
                    }
                }
            }
        }
    });

    // Gráfico de Evolución Semanal de Tickets (Línea)
    const weeklyEvolutionCtx = document.getElementById('weeklyEvolutionChart').getContext('2d');
    new Chart(weeklyEvolutionCtx, {
        type: 'line',
        data: {
            labels: data.weeklyEvolutionData.map(item => item.week),
            datasets: [{
                label: 'Tickets Creados',
                data: data.weeklyEvolutionData.map(item => item.tickets),
                borderColor: CHART_COLORS.green,
                backgroundColor: CHART_COLORS.lightGreen,
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: commonChartOptions.plugins.tooltip,
            },
            scales: {
                x: {
                    ticks: {
                        color: CHART_COLORS.darkGray
                    },
                    grid: {
                        color: CHART_COLORS.lightGray
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: CHART_COLORS.darkGray
                    },
                    grid: {
                        color: CHART_COLORS.lightGray
                    }
                }
            }
        }
    });
}

// --- Llenar Tarjetas KPI y Lista Top Recurrente ---
function populateKpisAndTopRecurring(data) {
    document.getElementById('totalTickets').textContent = data.totalTickets;
    document.getElementById('assignedTickets').textContent = data.assignedTickets;
    document.getElementById('avgResolutionTime').textContent = data.avgResolutionTime;
    document.getElementById('avgResponseTime').textContent = data.avgResponseTime;

    const topRecurringList = document.getElementById('topRecurringList');
    topRecurringList.innerHTML = ''; // Limpiar lista existente
    data.topRecurring.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${item.name}</span><span>${item.count} tickets</span>`;
        topRecurringList.appendChild(li);
    });
}

// --- Inicialización del Dashboard ---
document.addEventListener('DOMContentLoaded', () => {
    const simulatedData = generateSimulatedData();
    populateKpisAndTopRecurring(simulatedData);
    renderCharts(simulatedData);
});
