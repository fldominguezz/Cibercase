import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { toast } from 'react-toastify'; // Import toast
import { motion } from 'framer-motion'; // Import framer-motion
import { 
  apiFetch, 
  readTickets,
  readFormSubmissions, // Replaced readFormTemplates
  fetchTotalTicketsCount,
  fetchMyAssignedTicketsCount,
  fetchTicketCountsByStatus,
  fetchTicketCountsBySeverity,
  fetchTicketCountsByCategory,
  fetchMonthlyTicketEvolution,
  fetchAvgResolutionTime,
  fetchAvgResponseTime,
  fetchTopRecurring,
  remediateTicket
} from '../api';
import DashboardSkeleton from './Dashboard/DashboardSkeleton'; // Import the skeleton component
import './Dashboard/Dashboard.css'; // Importa los estilos del nuevo dashboard
import { useWebSocketContext } from '../context/WebSocketContext'; // Import useWebSocketContext
import { useModal } from '../context/ModalContext'; // Import useModal

// Chart.js imports
import { Chart as ChartJS, 
  ArcElement, 
  Tooltip, 
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  PointElement, 
  LineElement,
  DoughnutController, // Importar DoughnutController
  BarController, // Importar BarController
  LineController, // Importar LineController
  Filler // Importar Filler
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels'; // Import datalabels plugin

// Registrar Chart.js components
ChartJS.register(
  ArcElement, 
  Tooltip, 
  Legend,
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  PointElement, 
  LineElement,
  DoughnutController, // Registrar DoughnutController
  BarController, // Registrar BarController
  LineController, // Registrar LineController
  Filler, // Registrar Filler
  ChartDataLabels // Registrar datalabels plugin
);

// por defecto, OFF en todos los charts
ChartJS.defaults.set('plugins.datalabels', {
  display: false
});

// Número centrado SOLO para doughnut
const centerTotal = {
  id: 'centerTotal',
  afterDatasetsDraw(chart) {
    if (chart.config.type !== 'doughnut') return;

    const meta = chart.getDatasetMeta(0);
    if (!meta?.data?.length) return;

    const { x, y } = meta.data[0];
    const ds = chart.data.datasets[0];
    const total = ds.data.reduce((a,b)=>a+b,0);
    const newCount = chart.options.plugins.centerTotal?.newCount || 0;

    const { ctx, chartArea } = chart;
    const size = Math.max(18, Math.round(Math.min(chartArea.width, chartArea.height) / 5));
    const titleColor = chart.options.plugins.centerTotal?.color || '#111'; // Access color from plugin options

    ctx.save();
    ctx.font = `bold ${size}px Poppins, sans-serif`;
    ctx.fillStyle = titleColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (newCount > 0) {
      ctx.fillText(`${total} (+${newCount})`, x, y);
    } else {
      ctx.fillText(total, x, y);
    }
    ctx.restore();
  }
};

// Colores profesionales y suaves para los gráficos
const CHART_COLORS = {
  blue: '#4285F4',    // Google Blue
  green: '#34A853',   // Google Green
  orange: '#FBBC05',  // Google Yellow/Orange
  red: '#EA4335',     // Google Red
  gray: '#E0E0E0',    // Light Gray
  lightBlue: '#C5E1FF', // Lighter Blue
  lightGreen: '#B2EBF2', // Cyan-like
  lightOrange: '#FFECB3', // Lighter Orange
  lightRed: '#FFCDD2', // Lighter Red
  darkGray: '#757575', // Darker Gray
  purple: '#9C27B0', // Purple for other statuses
  teal: '#009688' // Teal for other statuses
};

const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const options = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: 'America/Argentina/Buenos_Aires'
    };
    return new Intl.DateTimeFormat('es-AR', options).format(date);
};

const Home = () => {
  const { theme } = useOutletContext(); // Obtener el tema del contexto
  const navigate = useNavigate();
  const { latestMessage, consumeMessage } = useWebSocketContext(); // Get latest message and consumer from WebSocket context
  const { openTicketModal, openInfoModal } = useModal(); // Use modal context

  const [myCreatedTickets, setMyCreatedTickets] = useState([]);
  const [myAssignedTickets, setMyAssignedTickets] = useState([]);
  const [allTickets, setAllTickets] = useState([]); // New state for all tickets
  const [formSubmissions, setFormSubmissions] = useState([]);
  const [totalTickets, setTotalTickets] = useState(0);
  const [myAssignedTicketsCount, setMyAssignedTicketsCount] = useState(0);
  const [ticketsByStatus, setTicketsByStatus] = useState({});
  const [ticketsBySeverity, setTicketsBySeverity] = useState({});
  const [ticketsByCategory, setTicketsByCategory] = useState({});
  const [monthlyEvolution, setMonthlyEvolution] = useState([]); // Changed from weeklyEvolution
  const [avgResolutionTime, setAvgResolutionTime] = useState('N/A');
  const [avgResponseTime, setAvgResponseTime] = useState('N/A');
  const [topRecurring, setTopRecurring] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('total'); // Initialize to 'total'
  const [allUsers, setAllUsers] = useState([]); // New state for all users
  const [currentUser, setCurrentUser] = useState(null); // New state for current user
  const [editingTicketId, setEditingTicketId] = useState(null); // State to track which ticket is being edited
  const [editedTicketData, setEditedTicketData] = useState(null); // State to hold edited ticket data
  const [birthdayUsers, setBirthdayUsers] = useState([]); // State for birthday reminder
  const [newTicketCount, setNewTicketCount] = useState(0);

  // State for date range filter
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Definir estados y severidades para los dropdowns
  const TICKET_STATUSES = ['Nuevo', 'En Progreso', 'Resuelto', 'Cerrado', 'Pendiente'];
  const TICKET_SEVERITIES = ['Baja', 'Media', 'Alta', 'Crítica', 'Desconocida'];

  // State for 'All Tickets' pagination
  const [totalAllTickets, setTotalAllTickets] = useState(0);
  const [allTicketsCurrentPage, setAllTicketsCurrentPage] = useState(1);
  const [allTicketsPageSize, setAllTicketsPageSize] = useState(20);

  // Referencias para los elementos canvas de los gráficos
  const statusChartRef = useRef(null);
  const severityChartRef = useRef(null);
  const categoryChartRef = useRef(null);
  const monthlyChartRef = useRef(null);

  const fetchData = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const [
        createdTicketsResponse, 
        assignedTicketsResponse, 
        submissions,
        totalTicketsCount,
        assignedCount,
        statusCounts,
        severityCounts,
        categoryCounts,
        monthlyEvoData,
        avgResTime,
        avgRespTime,
        topRecData,
        users,
        loggedInUser,
        birthdayData
      ] = await Promise.all([
        readTickets({ createdByMe: true, limit: 9999, sort_by: 'id', sort_order: 'desc' }).catch(err => { console.error("Error fetching created tickets:", err); return { tickets: [], total_count: 0 }; }),
        readTickets({ assignedToMe: true, limit: 9999, sort_by: 'id', sort_order: 'desc' }).catch(err => { console.error("Error fetching assigned tickets:", err); return { tickets: [], total_count: 0 }; }),
        readFormSubmissions().catch(err => { console.error("Error fetching form submissions:", err); return []; }),
        fetchTotalTicketsCount().catch(err => { console.error("Error fetching total tickets count:", err); return 0; }),
        fetchMyAssignedTicketsCount().catch(err => { console.error("Error fetching my assigned tickets count:", err); return 0; }),
        fetchTicketCountsByStatus().catch(err => { console.error("Error fetching ticket counts by status:", err); return {}; }),
        fetchTicketCountsBySeverity().catch(err => { console.error("Error fetching ticket counts by severity:", err); return {}; }),
        fetchTicketCountsByCategory().catch(err => { console.error("Error fetching ticket counts by category:", err); return {}; }),
        fetchMonthlyTicketEvolution().catch(err => { console.error("Error fetching monthly evolution:", err); return []; }),
        fetchAvgResolutionTime().catch(err => { console.error("Error fetching avg resolution time:", err); return { time: 'N/A' }; }),
        fetchAvgResponseTime().catch(err => { console.error("Error fetching avg response time:", err); return { time: 'N/A' }; }),
        fetchTopRecurring().catch(err => { console.error("Error fetching top recurring:", err); return []; }),
        apiFetch('/users/').catch(err => { console.error("Error fetching users:", err); return []; }),
        apiFetch('/auth/me').catch(err => { console.error("Error fetching current user:", err); return null; }),
        apiFetch('/users/birthdays/today').catch(err => { console.error("Error fetching birthday users:", err); return []; })
      ]);

      const createdTickets = createdTicketsResponse?.tickets || [];
      const assignedTickets = assignedTicketsResponse?.tickets || [];
      setMyCreatedTickets(createdTickets);
      setMyAssignedTickets(assignedTickets);
      setFormSubmissions(submissions);
      setTotalTickets(totalTicketsCount);
      setMyAssignedTicketsCount(assignedCount);
      setTicketsByStatus(statusCounts);
      setTicketsBySeverity(severityCounts);
      setTicketsByCategory(categoryCounts);
      setMonthlyEvolution(monthlyEvoData); // Changed from setWeeklyEvolution
      setAvgResolutionTime(avgResTime.time);
      setAvgResponseTime(avgRespTime.time);
      setTopRecurring(topRecData);
      setAllUsers(users); // Set all users
      setCurrentUser(loggedInUser); // Set current user
      setBirthdayUsers(birthdayData); // Set birthday users
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false); // Set loading to false once all data is fetched
    }
  }, [navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    // Ensure dark mode class is applied when Home component mounts
    if (theme === 'dark') {
      document.body.classList.add('dark-mode');
      document.documentElement.setAttribute('data-bs-theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      document.documentElement.setAttribute('data-bs-theme', 'light');
    }
  }); // No dependency array, runs on every render

  // Effect for fetching paginated 'All Tickets'
  useEffect(() => {
    const fetchPaginatedAllTickets = async () => {
      // setLoading(true); // Moved to fetchData for overall dashboard loading
      try {
        const skip = (allTicketsCurrentPage - 1) * allTicketsPageSize;
        const limit = allTicketsPageSize;
        const { tickets, total_count } = await readTickets({ skip, limit, start_date: startDate, end_date: endDate, sort_by: 'id', sort_order: 'desc' });
        setAllTickets(tickets);
        setTotalAllTickets(total_count);
      } catch (err) {
        setError(err.message);
      } finally {
        // setLoading(false); // Moved to fetchData
      }
    };

    if (!loading) { // Only fetch paginated tickets if overall dashboard loading is complete
      fetchPaginatedAllTickets();
    }
  }, [allTicketsCurrentPage, allTicketsPageSize, startDate, endDate, loading]);

  // Effect for handling real-time updates from WebSocket
  useEffect(() => {
    if (latestMessage && latestMessage.id) {
      console.log('Real-time update received:', latestMessage);

      // Check if the ticket is genuinely new by checking against the state
      const isNewTicket = !allTickets.some(ticket => ticket.id === latestMessage.id);

      if (isNewTicket) {
        // It's a new ticket
        const newTicket = { ...latestMessage, isNew: true };
        
        toast.info(`Nuevo ticket #${newTicket.id}: ${newTicket.resumen}`, {
          onClick: () => navigate(`/tickets/${newTicket.id}`)
        });

        // Add to the top of the list
        setAllTickets(prev => [newTicket, ...prev]);
        
        if (newTicket.creado_por_id === currentUser?.id) {
          setMyCreatedTickets(prev => [newTicket, ...prev]);
        }
        if (newTicket.asignado_a_id === currentUser?.id) {
          setMyAssignedTickets(prev => [newTicket, ...prev]);
        }
        
        // Update dashboard counts
        setTotalTickets(prev => prev + 1);
        if (newTicket.asignado_a_id === currentUser?.id) {
          setMyAssignedTicketsCount(prev => prev + 1);
        }
        setTicketsByStatus(prev => ({ ...prev, [newTicket.estado]: (prev[newTicket.estado] || 0) + 1 }));
        setTicketsBySeverity(prev => ({ ...prev, [newTicket.severidad]: (prev[newTicket.severidad] || 0) + 1 }));
        setTicketsByCategory(prev => ({ ...prev, [newTicket.categoria]: (prev[newTicket.categoria] || 0) + 1 }));

        // Remove the highlight after a delay
        setTimeout(() => {
          setAllTickets(prev => prev.map(t => t.id === newTicket.id ? { ...t, isNew: false } : t));
          setMyCreatedTickets(prev => prev.map(t => t.id === newTicket.id ? { ...t, isNew: false } : t));
          setMyAssignedTickets(prev => prev.map(t => t.id === newTicket.id ? { ...t, isNew: false } : t));
        }, 5000);

      } else {
        // It's an update to an existing ticket
        const updateTicketInState = (prevTickets) => prevTickets.map(t => 
          t.id === latestMessage.id ? { ...t, ...latestMessage } : t
        );
        setAllTickets(updateTicketInState);
        setMyCreatedTickets(updateTicketInState);
        setMyAssignedTickets(updateTicketInState);
        
        // Optionally, you might want to refresh counts if status/assignee changes
        // This can be complex, for now, we'll rely on the next full refresh or handle it if needed
      }

      // Consume the message to prevent re-processing
      consumeMessage();
    }
  }, [latestMessage, consumeMessage, allTickets, currentUser, navigate]);

  // Función para crear gráficos de dona
  const createDoughnutChart = (chartRef, labels, data, colors, total, newCount, clickHandler = null, currentTitleColor = '#111') => {
    if (!chartRef.current) return;
    if (chartRef.current.chart) { // Destruir gráfico existente si lo hay
        chartRef.current.chart.destroy();
    }
    const ctx = chartRef.current.getContext('2d');
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        backgroundColor: 'transparent',
        layout: {
            padding: 0
        },
        plugins: {
            legend: {
                position: 'top',
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
            datalabels: { display: false },
            centerTotal: {
              color: currentTitleColor, // Use the passed title color
              newCount: newCount
            }
        }
    };

    if (clickHandler) {
      options.onClick = (event, elements) => {
        if (elements.length > 0) {
          const clickedElementIndex = elements[0].index;
          const label = labels[clickedElementIndex];
          clickHandler(label);
        }
      };
    }

    chartRef.current.chart = new ChartJS(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderColor: 'transparent', // Usar fondo de tarjeta
                borderWidth: 0
            }]
        },
        options: options,
        plugins: [centerTotal]
    });
  };

  // Función para crear gráficos de barras
  const createBarChart = (chartRef, labels, data, colors) => {
    if (!chartRef.current) return;
    if (chartRef.current.chart) {
        chartRef.current.chart.destroy();
    }
    const ctx = chartRef.current.getContext('2d');
    chartRef.current.chart = new ChartJS(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Número de Tickets',
                data: data,
                backgroundColor: colors,
                borderColor: colors,
                borderWidth: 1,
                borderRadius: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            backgroundColor: 'transparent',
            layout: {
                padding: 0
            },
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
                },
                datalabels: {
                    display: true,
                    color: '#fff', // 🔸 blanco dentro de la barra
                    anchor: 'center',
                    align: 'center',
                    font: { weight: 'bold', size: 16 },
                    formatter: v => v
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
    chartRef.current.chart = new ChartJS(ctx, {
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
            backgroundColor: 'transparent',
            layout: {
                padding: 0
            },
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
    // Configurar colores globales de Chart.js según el tema
    const titleColor = theme === 'light' ? '#111827' : '#f9fafb';
    const gridColor = theme === 'light' ? '#eaeef3' : 'rgba(255, 255, 255, 0.1)';
    
    ChartJS.defaults.color = titleColor;
    ChartJS.defaults.borderColor = gridColor;

    if (!loading && !error) { // Solo inicializar gráficos si los datos se han cargado y no hay errores
      // Datos para Status Doughnut Chart
      const statusChartData = {
        labels: Object.keys(ticketsByStatus),
        data: Object.values(ticketsByStatus),
        colors: [
          CHART_COLORS.blue,
          CHART_COLORS.green,
          CHART_COLORS.orange,
          CHART_COLORS.red,
          CHART_COLORS.gray,
          CHART_COLORS.purple,
          CHART_COLORS.teal
        ],
      };
      createDoughnutChart(statusChartRef, statusChartData.labels, statusChartData.data, statusChartData.colors, totalTickets, newTicketCount, null, titleColor);

      // Handler para el click en el gráfico de severidad
      const handleSeverityClick = (severity) => {
        navigate(`/tickets-filtered?severity=${severity}`);
      };

      // Data for Severity Doughnut Chart
      const severityOrder = ['Crítica', 'Alta', 'Media', 'Baja', 'Desconocida'];
      const severityColors = {
        'Crítica': CHART_COLORS.red,
        'Alta': CHART_COLORS.orange,
        'Media': CHART_COLORS.lightOrange, // Using a lighter orange for medium
        'Baja': CHART_COLORS.green,
        'Desconocida': CHART_COLORS.gray,
      };

      const orderedSeverityLabels = [];
      const orderedSeverityData = [];
      const orderedSeverityBackgroundColors = [];

      severityOrder.forEach(severity => {
        if (ticketsBySeverity[severity] !== undefined) {
          orderedSeverityLabels.push(severity);
          orderedSeverityData.push(ticketsBySeverity[severity]);
          orderedSeverityBackgroundColors.push(severityColors[severity]);
        }
      });

      const severityChartData = {
        labels: orderedSeverityLabels,
        data: orderedSeverityData,
        colors: orderedSeverityBackgroundColors,
      };
      createDoughnutChart(severityChartRef, severityChartData.labels, severityChartData.data, severityChartData.colors, totalTickets, newTicketCount, handleSeverityClick, titleColor);

      // Data for Category Bar Chart
      const categoryChartData = {
        labels: Object.keys(ticketsByCategory),
        data: Object.values(ticketsByCategory),
        colors: CHART_COLORS.blue,
      };
      createBarChart(categoryChartRef, categoryChartData.labels, categoryChartData.data, categoryChartData.colors);

      // Data for Monthly Evolution Line Chart (Changed from Weekly)
      const monthlyEvolutionChartData = {
        labels: monthlyEvolution.map(item => item.month), // Changed from item.week
        data: monthlyEvolution.map(item => item.tickets),
        color: CHART_COLORS.green,
      };
      createLineChart(monthlyChartRef, monthlyEvolutionChartData.labels, monthlyEvolutionChartData.data, monthlyEvolutionChartData.color); // Changed from weeklyChartRef
    }
  }, [loading, error, totalTickets, ticketsByStatus, ticketsBySeverity, ticketsByCategory, monthlyEvolution, theme]); // Añadir theme a las dependencias


  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleViewTicketClick = (ticketId) => {
    openTicketModal(ticketId); // Use global modal
  };

  const handleRemediate = async (ticketId) => {
    try {
      await remediateTicket(ticketId);
      navigate(`/tickets/${ticketId}`);
    } catch (err) {
      setError(`Error al remediar el ticket: ${err.message}`);
    }
  };

  // Handlers for inline editing
  const handleEditClick = (ticket) => {
    setEditingTicketId(ticket.id);
    setEditedTicketData({
      estado: ticket.estado,
      asignado_a_id: ticket.asignado_a_id,
    });
  };

  const handleSaveClick = async (ticketId) => {
    try {
      const updatedTicket = await apiFetch(`/api/v1/tickets/${ticketId}`, {
        method: 'PUT',
        body: JSON.stringify(editedTicketData),
      });

      // Update the allTickets state with the saved changes
      setAllTickets(prevTickets => 
        prevTickets.map(ticket => 
          ticket.id === ticketId ? { ...ticket, ...updatedTicket } : ticket
        )
      );
      setEditingTicketId(null);
      setEditedTicketData(null);
    } catch (err) {
      setError(`Error al guardar el ticket: ${err.message}`);
    }
  };

  const handleCancelClick = () => {
    setEditingTicketId(null);
    setEditedTicketData(null);
  };

  const handleStatusChange = (e) => {
    setEditedTicketData(prevData => ({
      ...prevData,
      estado: e.target.value,
    }));
  };

  const handleAssigneeChange = (e) => {
    setEditedTicketData(prevData => ({
      ...prevData,
      asignado_a_id: e.target.value === "" ? null : parseInt(e.target.value),
    }));
  };

  // Handlers for pagination
  const handlePageChange = (newPage) => {
    setAllTicketsCurrentPage(newPage);
  };

  const handlePageSizeChange = (event) => {
    setAllTicketsPageSize(Number(event.target.value));
    setAllTicketsCurrentPage(1); // Reset to first page
  };

  // Helper to navigate to filtered tickets view
  const handleNavigateToFilteredTickets = (filterType, filterValue) => {
    navigate(`/tickets-filtered?${filterType}=${filterValue}`);
  };

  const totalPages = Math.ceil(totalAllTickets / allTicketsPageSize);

  // Animation variants for Framer Motion
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1
    }
  };

  return (
    <motion.div 
      className="dashboard-container"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.h1 variants={itemVariants} className="dashboard-title">Panel de Control SOC</motion.h1>

      {birthdayUsers.length > 0 && (
        <motion.div variants={itemVariants} className="alert alert-info" role="alert">
          <strong>¡Feliz Cumpleaños!</strong> 🎂 Hoy es el cumpleaños de: {birthdayUsers.map(user => `${user.first_name} ${user.last_name}`).join(', ')}.
        </motion.div>
      )}

      {loading && <DashboardSkeleton />}
      {error && <div className="alert alert-danger">{error}</div>}
      
      {!loading && !error && (
        <>
          {/* Sección de KPIs */}
          <motion.div variants={itemVariants} className="kpi-grid">
              <div className="kpi-card" onClick={() => handleNavigateToFilteredTickets('all', 'true')}> 
                  <div className="kpi-value">{totalTickets}</div>
                  <div className="kpi-label">Total de Tickets</div>
              </div>
              <div className="kpi-card" onClick={() => handleNavigateToFilteredTickets('assignedToMe', 'true')}> 
                  <div className="kpi-value">{myAssignedTicketsCount}</div>
                  <div className="kpi-label">Mis Tickets Asignados</div>
              </div>
              <div className="kpi-card">
                  <div className="kpi-value">{avgResolutionTime}</div>
                  <div className="kpi-label">Tiempo Promedio de Resolución</div>
              </div>
              <div className="kpi-card">
                  <div className="kpi-value">{avgResponseTime}</div>
                  <div className="kpi-label">Tiempo Promedio de Respuesta</div>
              </div>
          </motion.div>

          {/* Grid para las gráficas y la tabla */}
          <motion.div variants={itemVariants} className="charts-grid">
              {/* Tarjeta: Tickets por Estado (Dona) */}
              <div className="card chart-card card--estado">
                  <h2 className="card-title">Tickets por Estado</h2>
                  <div className="chart-container">
                      <canvas ref={statusChartRef} key={`status-chart-${theme}`} style={{ backgroundColor: 'transparent' }}></canvas>
                  </div>
              </div>

              {/* Tarjeta: Tickets por Severidad (Dona) */}
              <div className="card chart-card card--severidad">
                  <h2 className="card-title">Tickets por Severidad</h2>
                  <div className="chart-container">
                      <canvas ref={severityChartRef} key={`severity-chart-${theme}`} style={{ backgroundColor: 'transparent' }}></canvas>
                  </div>
              </div>

              {/* Tarjeta: Tickets por Categoría (Barras) */}
              <div className="card chart-card card--categoria">
                  <h2 className="card-title">Tickets por Categoría</h2>
                  <div className="chart-container">
                      <canvas ref={categoryChartRef} key={`category-chart-${theme}`} style={{ backgroundColor: 'transparent' }}></canvas>
                  </div>
              </div>

              {/* Tarjeta: Evolución Mensual de Tickets (Línea) */}
              <div className="card chart-card card--evolucion">
                  <h2 className="card-title">Evolución Mensual de Tickets</h2>
                  <div className="chart-container">
                      <canvas ref={monthlyChartRef} key={`monthly-chart-${theme}`} style={{ backgroundColor: 'transparent' }}></canvas>
                  </div>
              </div>

              {/* Tarjeta: Top 10 Dispositivos/Usuarios Recurrentes (Tabla) */}
              <div className="card table-card card--top10">
                  <h2 className="card-title">Top 10 Dispositivos/Usuarios Recurrentes</h2>
                  <div className="table-responsive">
                      <table className="table table-hover recurring-items-table">
                          <thead>
                              <tr>
                                  <th>#</th>
                                  <th>Entidad</th>
                                  <th>Tickets</th>
                              </tr>
                          </thead>
                          <tbody>
                              {topRecurring.length > 0 ? (
                                  topRecurring.map((item, index) => (
                                      <tr key={index}>
                                          <td>{index + 1}</td>
                                          <td>{item.name}</td>
                                          <td><span className="badge bg-warning">{item.count}</span></td>
                                      </tr>
                                  ))
                              ) : (
                                  <tr>
                                      <td colSpan="3" className="text-center">No hay datos recurrentes.</td>
                                  </tr>
                              )}
                          </tbody>
                      </table>
                  </div>
              </div>
          </motion.div>

          <motion.div variants={itemVariants}>
            {/* Existing Tabs for Created and Assigned Tickets */}
            <ul className="nav nav-tabs mb-3 mt-4"> {/* Añadir margen superior */}
              <li className="nav-item">
                <button 
                  className={`nav-link ${activeTab === 'total' ? 'active' : ''}`}
                  onClick={() => setActiveTab('total')}
                >
                  Total de Tickets
                </button>
              </li>
              <li className="nav-item">
                <button 
                  className={`nav-link ${activeTab === 'created' ? 'active' : ''}`}
                  onClick={() => setActiveTab('created')}
                >
                  Tickets Creados por Mí
                </button>
              </li>
              <li className="nav-item">
                <button 
                  className={`nav-link ${activeTab === 'assigned' ? 'active' : ''}`}
                  onClick={() => setActiveTab('assigned')}
                >
                  Tickets Asignados a Mí
                </button>
              </li>
            </ul>
          </motion.div>

          <motion.div variants={itemVariants}>
            {activeTab === 'total' && (
              <div className="ticket-list-card card mb-4">
                  <h5 className="card-title">Total de Tickets</h5>
                  <div className="row mb-3">
                    <div className="col-md-4">
                      <label htmlFor="startDate" className="form-label">Fecha de Inicio:</label>
                      <input 
                        type="date" 
                        className="form-control" 
                        id="startDate" 
                        value={startDate} 
                        onChange={(e) => setStartDate(e.target.value)} 
                      />
                    </div>
                    <div className="col-md-4">
                      <label htmlFor="endDate" className="form-label">Fecha de Fin:</label>
                      <input 
                        type="date" 
                        className="form-control" 
                        id="endDate" 
                        value={endDate} 
                        onChange={(e) => setEndDate(e.target.value)} 
                      />
                    </div>
                  </div>
                  <div className="table-responsive">
                    <table className="table table-hover table-striped">
                      <thead className="">
                        <tr>
                          <th scope="col">ID</th>
                          <th scope="col">UID</th>
                          <th scope="col">Estado</th>
                          <th scope="col">Severidad</th>
                          <th scope="col">Creado Por</th>
                          <th scope="col">Asignado A</th> {/* New column */}
                          <th scope="col">Titulo</th>
                          <th scope="col">Fecha/Hora Creación</th>
                          <th scope="col">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allTickets.length > 0 ? (
                          allTickets.map(ticket => (
                            <tr key={ticket.id} className={ticket.isNew ? 'new-ticket-highlight' : ''}>
                              <td>{ticket.id}</td>
                              <td>{ticket.ticket_uid}</td>
                              <td>
                                {editingTicketId === ticket.id ? (
                                  <select 
                                    className="form-select form-select-sm"
                                    value={editedTicketData?.estado || ticket.estado} 
                                    onChange={(e) => handleStatusChange(e)}
                                  >
                                    {TICKET_STATUSES.map(status => (
                                      <option key={status} value={status}>{status}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className={`badge bg-${ticket.estado === 'Nuevo' ? 'primary' : ticket.estado === 'En Progreso' ? 'warning' : ticket.estado === 'Resuelto' ? 'success' : 'secondary'}`}>{ticket.estado}</span>
                                )}
                              </td>
                              <td>{ticket.severidad}</td>
                              <td>{ticket.reportado_por_nombre || 'N/A'}</td>
                              <td>
                                {editingTicketId === ticket.id ? (
                                  <select 
                                    className="form-select form-select-sm"
                                    value={editedTicketData?.asignado_a_id || ticket.asignado_a_id || ''} 
                                    onChange={(e) => handleAssigneeChange(e)}
                                  >
                                    <option value="">Sin Asignar</option>
                                    {allUsers.map(user => (
                                      <option key={user.id} value={user.id}>{user.first_name} {user.last_name}</option>
                                    ))}
                                  </select>
                                ) : (
                                  (() => { const assignedUser = allUsers.find(user => user.id === ticket.asignado_a_id); return assignedUser ? `${assignedUser.first_name || ''} ${assignedUser.last_name || ''}`.trim() || 'N/A' : 'N/A'; })()
                                )}
                              </td>
                              <td>{ticket.resumen}</td>
                              <td>{formatDateTime(ticket.creado_en)}</td>
                              <td>
                                {editingTicketId === ticket.id ? (
                                  <>
                                    <button onClick={() => handleSaveClick(ticket.id)} className="btn btn-sm btn-success me-1">Guardar</button>
                                    <button onClick={handleCancelClick} className="btn btn-sm btn-secondary">Cancelar</button>
                                  </>
                                ) : (
                                  <>
                                    {!ticket.asignado_a_id && (
                                      <button onClick={() => handleRemediate(ticket.id)} className="btn btn-sm btn-success me-1">Remediar</button>
                                    )}
                                    {ticket.asignado_a_id === currentUser?.id && (
                                      <button onClick={() => navigate(`/tickets/${ticket.id}`)} className="btn btn-sm btn-primary me-1">Continuar Trabajo</button>
                                    )}
                                    {(currentUser?.role === 'Admin' || currentUser?.role === 'Lider') && (
                                      <button onClick={() => handleEditClick(ticket)} className="btn btn-sm btn-warning me-1">Editar</button>
                                    )}
                                    <button onClick={() => openTicketModal(ticket.id)} className="btn btn-sm btn-info me-1">Ver</button>
                                    {ticket.raw_logs && (
                                      <button onClick={() => openInfoModal('Raw Logs', ticket.raw_logs)} className="btn btn-sm btn-secondary me-1">
                                        Ver Raw Logs
                                      </button>
                                    )}
                                    {ticket.rule_name && (
                                      <button onClick={() => openInfoModal(`Regla: ${ticket.rule_name}`, `Descripción: ${ticket.rule_description || 'N/A'}\nRemediación: ${ticket.rule_remediation || 'N/A'}`)} className="btn btn-sm btn-secondary">
                                        Ver Regla
                                      </button>
                                    )}
                                  </>
                                )}
                              </td>
                            </tr>
                          )) 
                        ) : (
                          <tr>
                            <td colSpan="9" className="text-center">No hay tickets en el sistema.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  {/* Pagination Controls */}
                  <div className="d-flex justify-content-between align-items-center mt-3">
                    <div>
                      <select className="form-select form-select-sm" value={allTicketsPageSize} onChange={handlePageSizeChange} style={{ width: 'auto' }}>
                        <option value={10}>10 por página</option>
                        <option value={20}>20 por página</option>
                        <option value={50}>50 por página</option>
                        <option value={100}>100 por página</option>
                      </select>
                    </div>
                    <nav>
                      <ul className="pagination pagination-sm mb-0">
                        <li className={`page-item ${allTicketsCurrentPage === 1 ? 'disabled' : ''}`}>
                          <button className="page-link" onClick={() => handlePageChange(allTicketsCurrentPage - 1)}>Anterior</button>
                        </li>
                        <li className="page-item disabled">
                          <span className="page-link">
                            Página {allTicketsCurrentPage} de {totalPages}
                          </span>
                        </li>
                        <li className={`page-item ${allTicketsCurrentPage === totalPages ? 'disabled' : ''}`}>
                          <button className="page-link" onClick={() => handlePageChange(allTicketsCurrentPage + 1)}>Siguiente</button>
                        </li>
                      </ul>
                    </nav>
                  </div>
              </div>
            )}
          </motion.div>

          <motion.div variants={itemVariants}>
            {activeTab === 'created' && (
              <div className="ticket-list-card card mb-4"> {/* Añadir clase 'card' para estilo consistente */}
                  <h5 className="card-title">Tickets Creados por Mí</h5>
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead className="">
                        <tr>
                          <th scope="col">ID</th>
                          <th scope="col">UID</th>
                          <th scope="col">Estado</th>
                          <th scope="col">Severidad</th>
                          <th scope="col">Creado Por</th>
                          <th scope="col">Titulo</th>
                          <th scope="col">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {myCreatedTickets.length > 0 ? (
                          myCreatedTickets.map(ticket => (
                            <tr key={ticket.id}>
                              <td>{ticket.id}</td>
                              <td>{ticket.ticket_uid}</td>
                              <td><span className={`badge bg-${ticket.estado === 'Nuevo' ? 'primary' : ticket.estado === 'En Progreso' ? 'warning' : ticket.estado === 'Resuelto' ? 'success' : 'secondary'}`}>{ticket.estado}</span></td>
                              <td>{ticket.severidad}</td>
                              <td>{ticket.reportado_por_nombre || 'N/A'}</td>
                              <td>{ticket.resumen}</td>
                              <td>
                                <button onClick={() => openTicketModal(ticket.id)} className="btn btn-sm btn-info me-1">Ver</button>
                                <button onClick={() => handleEditClick(ticket)} className="btn btn-sm btn-warning me-1">Editar</button>
                                <button onClick={() => handleRemediate(ticket.id)} className="btn btn-sm btn-success me-1">Remediar</button>
                                {ticket.raw_logs && (
                                  <button onClick={() => openInfoModal('Raw Logs', ticket.raw_logs)} className="btn btn-sm btn-secondary me-1">
                                    Ver Raw Logs
                                  </button>
                                )}
                                {ticket.rule_name && (
                                  <button onClick={() => openInfoModal(`Regla: ${ticket.rule_name}`, `Descripción: ${ticket.rule_description || 'N/A'}\nRemediación: ${ticket.rule_remediation || 'N/A'}`)} className="btn btn-sm btn-secondary">
                                    Ver Regla
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="7" className="text-center">No has creado tickets.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
              </div>
            )}
          </motion.div>

          <motion.div variants={itemVariants}>
            {activeTab === 'assigned' && (
              <div className="ticket-list-card card mb-4"> {/* Añadir clase 'card' para estilo consistente */}
                  <h5 className="card-title">Tickets Asignados a Mí</h5>
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead className="">
                        <tr>
                          <th scope="col">ID</th>
                          <th scope="col">UID</th>
                          <th scope="col">Estado</th>
                          <th scope="col">Severidad</th>
                          <th scope="col">Creado Por</th>
                          <th scope="col">Titulo</th>
                          <th scope="col">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {myAssignedTickets.length > 0 ? (
                          myAssignedTickets.map(ticket => (
                            <tr key={ticket.id}>
                              <td>{ticket.id}</td>
                              <td>{ticket.ticket_uid}</td>
                              <td><span className={`badge bg-${ticket.estado === 'Nuevo' ? 'primary' : ticket.estado === 'En Progreso' ? 'warning' : ticket.estado === 'Resuelto' ? 'success' : 'secondary'}`}>{ticket.estado}</span></td>
                              <td>{ticket.severidad}</td>
                              <td>{ticket.reportado_por_nombre || 'N/A'}</td>
                              <td>{ticket.resumen}</td>
                              <td>
                                <button onClick={() => openTicketModal(ticket.id)} className="btn btn-sm btn-info me-1">Ver</button>
                                <button onClick={() => handleEditClick(ticket)} className="btn btn-sm btn-warning me-1">Editar</button>
                                <button onClick={() => handleRemediate(ticket.id)} className="btn btn-sm btn-success me-1">Remediar</button>
                                {ticket.raw_logs && (
                                  <button onClick={() => openInfoModal('Raw Logs', ticket.raw_logs)} className="btn btn-sm btn-secondary me-1">
                                    Ver Raw Logs
                                  </button>
                                )}
                                {ticket.rule_name && (
                                  <button onClick={() => openInfoModal(`Regla: ${ticket.rule_name}`, `Descripción: ${ticket.rule_description || 'N/A'}\nRemediación: ${ticket.rule_remediation || 'N/A'}`)} className="btn btn-sm btn-secondary">
                                    Ver Regla
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="7" className="text-center">No tienes tickets asignados.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
              </div>
            )}
          </motion.div>
          
          <motion.div variants={itemVariants} className="form-list-card card mb-4"> {/* Añadir clase 'card' para estilo consistente */}
            <div className="card-body">
              <h5 className="card-title">Formularios Creados</h5>
              <div className="table-responsive">
                <table className="table table-hover">

                  <thead>
                    <tr>
                      <th scope="col">ID</th>
                      <th scope="col">Formulario</th>
                      <th scope="col">Enviado por</th>
                      <th scope="col">Fecha de Envío</th>
                      <th scope="col">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formSubmissions.length > 0 ? (
                      formSubmissions.map(submission => (
                        <tr key={submission.id}>
                          <td>{submission.id}</td>
                          <td>{submission.template?.nombre || 'Formulario Genérico'}</td>
                          <td>{`${submission.enviado_por.first_name} ${submission.enviado_por.last_name}`}</td>
                          <td>{formatDateTime(submission.enviado_en)}</td>
                          <td>
                            <button 
                              className="btn btn-sm btn-info"
                              onClick={() => {
                                const formatSubmissionData = (submission) => {
                                  let formattedData = `Formulario: ${submission.template?.nombre || 'Formulario Genérico'}\n`;
                                  formattedData += `Enviado por: ${submission.enviado_por.first_name} ${submission.enviado_por.last_name}\n`;
                                  formattedData += `Fecha: ${formatDateTime(submission.enviado_en)}\n\n`;
                                  formattedData += '----------------------------------------\n';
                                  formattedData += 'Datos del Formulario:\n';
                                  formattedData += '----------------------------------------\n\n';
                                  
                                  if (submission.form_data && typeof submission.form_data === 'object') {
                                    Object.entries(submission.form_data).forEach(([key, value]) => {
                                      formattedData += `  • ${key.replace(/_/g, ' ')}: ${value}\n`;
                                    });
                                  } else {
                                    formattedData += 'No hay datos de formulario disponibles.';
                                  }
                                  return formattedData;
                                };

                                openInfoModal(
                                  `Detalles de Envío #${submission.id}`,
                                  formatSubmissionData(submission)
                                );
                              }}
                            >
                              Ver Detalles
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="text-center">No hay formularios enviados.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </motion.div>
  );
};

export default Home;