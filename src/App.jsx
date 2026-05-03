import { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import './App.css';

function App() {
  // --- Estados Principales ---
  const [workers, setWorkers] = useState(() => {
    const saved = localStorage.getItem('workers');
    if (saved) {
      return JSON.parse(saved);
    }
    return [];
  });
  
  const [newName, setNewName] = useState('');

  // --- Estados del Cronómetro e Informes ---
  const [timerState, setTimerState] = useState(() => {
    const saved = localStorage.getItem('timerState');
    return saved ? JSON.parse(saved) : {
      isTimerRunning: false,
      timerSeconds: 0,
      timerStartTime: null,
      sessionClicks: {}
    };
  });

  // Desestructuramos para facilidad de uso, pero actualizaremos vía setTimerState
  const { isTimerRunning, timerSeconds, timerStartTime, sessionClicks } = timerState;

  const [reports, setReports] = useState(() => {
    const saved = localStorage.getItem('reports');
    return saved ? JSON.parse(saved) : [];
  });
  const [showReportModal, setShowReportModal] = useState(false);
  const [currentReport, setCurrentReport] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showDailyReport, setShowDailyReport] = useState(false);

  // --- Efectos de Persistencia ---
  useEffect(() => {
    localStorage.setItem('workers', JSON.stringify(workers));
  }, [workers]);

  useEffect(() => {
    localStorage.setItem('reports', JSON.stringify(reports));
  }, [reports]);

  useEffect(() => {
    localStorage.setItem('timerState', JSON.stringify(timerState));
  }, [timerState]);

  // --- Efecto del Cronómetro ---
  useEffect(() => {
    let interval = null;
    if (isTimerRunning && timerStartTime) {
      // Actualización inmediata al montar o cambiar estado
      const now = Date.now();
      setTimerState(prev => ({
        ...prev,
        timerSeconds: Math.floor((now - prev.timerStartTime) / 1000)
      }));

      interval = setInterval(() => {
        const now = Date.now();
        setTimerState(prev => ({
          ...prev,
          timerSeconds: Math.floor((now - prev.timerStartTime) / 1000)
        }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerStartTime]);

  const formatTime = (totalSeconds) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // --- Lógica de Trabajadores ---
  const handleAddWorker = (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    
    if (workers.some(w => w.name.toLowerCase() === newName.trim().toLowerCase())) {
        alert('Este nombre ya existe');
        return;
    }

    setWorkers([...workers, { id: Date.now(), name: newName.trim(), count: 0 }]);
    setNewName('');
  };

  const incrementCount = (id, e) => {
    if (!isTimerRunning) {
      alert("Por favor, dale a '▶ Iniciar Sesión' en el cronómetro para poder registrar tareas.");
      return;
    }

    setWorkers(workers.map(w => 
      w.id === id ? { ...w, count: w.count + 1 } : w
    ));
    
    if (isTimerRunning) {
      setTimerState(prev => ({
        ...prev,
        sessionClicks: {
          ...prev.sessionClicks,
          [id]: (prev.sessionClicks[id] || 0) + 1
        }
      }));
    }

    if (e) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (rect.left + rect.width / 2) / window.innerWidth;
      const y = (rect.top + rect.height / 2) / window.innerHeight;
      
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { x, y },
        colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
        disableForReducedMotion: true,
        zIndex: 1000
      });
    }
  };
  
  const decrementCount = (id, e) => {
    e.stopPropagation();
    if (!isTimerRunning) return;

    setWorkers(workers.map(w => 
      w.id === id ? { ...w, count: Math.max(0, w.count - 1) } : w
    ));
    
    if (isTimerRunning) {
      setTimerState(prev => ({
        ...prev,
        sessionClicks: {
          ...prev.sessionClicks,
          [id]: Math.max(0, (prev.sessionClicks[id] || 0) - 1)
        }
      }));
    }
  };

  const removeWorker = (id, e) => {
    e.stopPropagation();
    if (confirm('¿Eliminar este trabajador?')) {
        setWorkers(workers.filter(w => w.id !== id));
    }
  };

  // --- Lógica del Cronómetro ---
  const handleStartTimer = () => {
    const now = Date.now();
    const startTime = now - (timerSeconds * 1000);
    
    setTimerState(prev => ({
        ...prev,
        isTimerRunning: true,
        timerStartTime: startTime,
        sessionClicks: timerSeconds === 0 ? {} : prev.sessionClicks
    }));
  };
  
  const handlePauseTimer = () => {
    setTimerState(prev => ({
        ...prev,
        isTimerRunning: false,
        timerStartTime: null
    }));
  };
  
  const handleStopTimer = () => {
    if (timerSeconds === 0) return; // Evitar reportes vacíos

    setIsTimerRunning(false);
    
    const totalSessionClicks = Object.values(sessionClicks).reduce((a, b) => a + b, 0);
    
    // Obtener detalles de quién ha trabajado, ordenados por más clicks
    const workerDetails = workers.map(w => ({
        name: w.name,
        clicks: sessionClicks[w.id] || 0
    })).filter(w => w.clicks > 0).sort((a, b) => b.clicks - a.clicks);

    const now = new Date();
    const report = {
        id: Date.now(),
        date: now.toLocaleString(),
        day: now.toLocaleDateString(),
        duration: timerSeconds,
        totalClicks: totalSessionClicks,
        workerDetails
    };

    setReports([report, ...reports]);
    setCurrentReport(report);
    setShowReportModal(true);
    
    setTimerState(prev => ({
        ...prev,
        isTimerRunning: false,
        timerSeconds: 0,
        timerStartTime: null,
        sessionClicks: {}
    }));
  };

  const deleteReport = (id) => {
    if (confirm('¿Eliminar este informe?')) {
        setReports(reports.filter(r => r.id !== id));
    }
  };

  const getDailyReport = () => {
    const today = new Date().toLocaleDateString();
    // Filtramos los reportes que tengan 'day' igual a hoy, o si es un reporte antiguo, comprobamos que 'date' empiece por la fecha de hoy
    const todaysReports = reports.filter(r => r.day === today || r.date.startsWith(today)); 
    
    let totalDuration = 0;
    let totalClicks = 0;
    const workerAgg = {};

    todaysReports.forEach(r => {
        totalDuration += r.duration;
        totalClicks += r.totalClicks;
        r.workerDetails.forEach(w => {
            workerAgg[w.name] = (workerAgg[w.name] || 0) + w.clicks;
        });
    });

    const workerDetails = Object.keys(workerAgg).map(name => ({
        name,
        clicks: workerAgg[name]
    })).sort((a, b) => b.clicks - a.clicks);

    return {
        date: today,
        duration: totalDuration,
        totalClicks,
        workerDetails,
        sessionCount: todaysReports.length
    };
  };

  return (
    <div className="app-container">
      {/* HEADER Y CRONÓMETRO */}
      <header className="header">
        <div className="header-top">
          <h1>Control de Trabajo</h1>
          <div className="header-buttons">
            <button className="history-btn daily-btn" onClick={() => setShowDailyReport(true)}>
              Resumen de Hoy
            </button>
            <button className="history-btn" onClick={() => setShowHistoryModal(true)}>
              Ver Informes
            </button>
          </div>
        </div>
        
        <div className={`stopwatch-container ${isTimerRunning ? 'running' : ''}`}>
          <div className="stopwatch-display">
            <span className="time">{formatTime(timerSeconds)}</span>
            {isTimerRunning && <span className="pulse"></span>}
          </div>
          <div className="stopwatch-controls">
            {!isTimerRunning ? (
              <button className="btn-start" onClick={handleStartTimer}>
                {timerSeconds === 0 ? '▶ Iniciar Sesión' : '▶ Continuar'}
              </button>
            ) : (
              <button className="btn-pause" onClick={handlePauseTimer}>
                ⏸ Pausar
              </button>
            )}
            <button 
              className="btn-stop" 
              onClick={handleStopTimer}
              disabled={timerSeconds === 0 && !isTimerRunning}
            >
              ⏹ Finalizar y Ver Informe
            </button>
          </div>
        </div>
      </header>

      {/* FORMULARIO */}
      <form className="add-worker-form" onSubmit={handleAddWorker}>
        <input 
          type="text" 
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Añadir trabajador..."
          className="name-input"
          autoFocus
        />
        <button type="submit" className="add-button">Añadir</button>
      </form>

      {/* GRID DE TRABAJADORES */}
      <div className="workers-grid">
        {workers.map(worker => {
          const sessionCount = sessionClicks[worker.id] || 0;
          const maxCount = workers.length > 0 ? Math.max(...workers.map(w => w.count)) : 0;
          const minCount = workers.length > 0 ? Math.min(...workers.map(w => w.count)) : 0;
          const isLeader = worker.count === maxCount && maxCount > 0;
          const isLast = worker.count === minCount && minCount < maxCount;
          
          return (
            <div key={worker.id} className={`worker-card ${!isTimerRunning ? 'disabled' : ''} ${isLeader && isTimerRunning ? 'is-leader' : ''} ${isLast && isTimerRunning ? 'is-last' : ''}`} onClick={(e) => incrementCount(worker.id, e)}>
              <div className="worker-info">
                  <span className="worker-name">
                    {worker.name} 
                    {isLeader && isTimerRunning && <span className="fire-icon" title="¡Va ganando!">🔥</span>}
                    {isLast && isTimerRunning && <span className="sleeping-icon" title="¡Se ha quedado dormido!">😴</span>}
                  </span>
                  <div className="counter-container">
                      <span className="worker-count">{worker.count}</span>
                  </div>
                  {/* Badge para mostrar los clicks de esta sesión si está corriendo el timer */}
                  {timerSeconds > 0 && sessionCount > 0 && (
                     <div className="session-badge">
                        +{sessionCount} en esta sesión
                     </div>
                  )}
              </div>
              <div className="actions">
                 <span className="hint">Click para sumar 1</span>
                 <button className="decrement-btn" onClick={(e) => decrementCount(worker.id, e)} title="Restar 1 al contador">Restar</button>
                 <button className="remove-btn" onClick={(e) => removeWorker(worker.id, e)} title="Eliminar trabajador">Eliminar</button>
              </div>
            </div>
          )
        })}
        {workers.length === 0 && (
            <div className="empty-state">
                <div className="empty-icon">👥</div>
                <p>No hay trabajadores todavía.</p>
                <p style={{fontSize: '0.9rem', opacity: 0.7, marginTop: '0.5rem'}}>Escribe un nombre arriba y pulsa "Añadir" para empezar.</p>
            </div>
        )}
      </div>

      {/* MODAL DE INFORME ACTUAL */}
      {showReportModal && currentReport && (
        <div className="modal-overlay" onClick={() => setShowReportModal(false)}>
          <div className="modal-content report-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowReportModal(false)}>×</button>
            <h2>Informe de Sesión</h2>
            <div className="report-summary">
                <div className="stat-box">
                    <span className="stat-label">Tiempo Total</span>
                    <span className="stat-value">{formatTime(currentReport.duration)}</span>
                </div>
                <div className="stat-box">
                    <span className="stat-label">Tareas Totales</span>
                    <span className="stat-value">{currentReport.totalClicks}</span>
                </div>
            </div>
            
            <h3>Desglose por trabajador</h3>
            {currentReport.workerDetails.length > 0 ? (
                <div className="worker-stats-list">
                    {currentReport.workerDetails.map((w, i) => (
                        <div key={i} className="worker-stat-row">
                            <span className="w-name">{w.name}</span>
                            <span className="w-clicks">{w.clicks} tareas</span>
                            <div className="progress-bar-bg">
                                <div 
                                  className="progress-bar-fill" 
                                  style={{width: `${(w.clicks / currentReport.totalClicks) * 100}%`}}>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="no-data">Nadie realizó ninguna tarea en esta sesión.</p>
            )}
          </div>
        </div>
      )}

      {/* MODAL DE RESUMEN DIARIO */}
      {showDailyReport && (() => {
        const daily = getDailyReport();
        const maxClicks = daily.workerDetails.length > 0 ? daily.workerDetails[0].clicks : 0;
        const minClicks = daily.workerDetails.length > 0 ? daily.workerDetails[daily.workerDetails.length - 1].clicks : 0;

        return (
          <div className="modal-overlay" onClick={() => setShowDailyReport(false)}>
            <div className="modal-content report-modal" onClick={e => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setShowDailyReport(false)}>×</button>
              <h2>Resumen de Hoy ({daily.date})</h2>
              
              <div className="report-summary">
                  <div className="stat-box">
                      <span className="stat-label">Tiempo Total (Hoy)</span>
                      <span className="stat-value">{formatTime(daily.duration)}</span>
                  </div>
                  <div className="stat-box">
                      <span className="stat-label">Sesiones</span>
                      <span className="stat-value">{daily.sessionCount}</span>
                  </div>
                  <div className="stat-box">
                      <span className="stat-label">Tareas Totales</span>
                      <span className="stat-value">{daily.totalClicks}</span>
                  </div>
              </div>
              
              <h3>Desglose general del día</h3>
              {daily.workerDetails.length > 0 ? (
                  <div className="worker-stats-list">
                      {daily.workerDetails.map((w, i) => {
                          const isWinner = w.clicks === maxClicks && maxClicks > 0;
                          const isLoser = w.clicks === minClicks && minClicks < maxClicks;
                          
                          return (
                          <div key={i} className={`worker-stat-row ${isWinner ? 'is-leader-row' : ''}`}>
                              <span className="w-name">
                                {w.name}
                                {isWinner && <span style={{marginLeft: '0.5rem', fontSize: '1.2rem'}} title="El Rey del Día">👑</span>}
                                {isLoser && <span style={{marginLeft: '0.5rem', fontSize: '1.2rem'}} title="Menos trabajo realizado">💩</span>}
                              </span>
                              <span className="w-clicks">{w.clicks} tareas</span>
                              <div className="progress-bar-bg">
                                  <div 
                                    className="progress-bar-fill" 
                                    style={{width: `${(w.clicks / daily.totalClicks) * 100}%`}}>
                                  </div>
                              </div>
                          </div>
                      )})}
                  </div>
              ) : (
                  <p className="no-data">No se ha registrado ninguna tarea hoy.</p>
              )}
            </div>
          </div>
        );
      })()}

      {/* MODAL DE HISTORIAL DE INFORMES */}
      {showHistoryModal && (
        <div className="modal-overlay" onClick={() => setShowHistoryModal(false)}>
          <div className="modal-content history-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowHistoryModal(false)}>×</button>
            <h2>Historial de Sesiones</h2>
            {reports.length > 0 ? (
                <div className="history-list">
                    {reports.map(report => (
                        <div key={report.id} className="history-item">
                            <div className="history-header">
                                <span className="h-date">{report.date}</span>
                                <button className="h-delete" onClick={() => deleteReport(report.id)}>Borrar</button>
                            </div>
                            <div className="h-stats">
                                <span>⏱ {formatTime(report.duration)}</span>
                                <span>✅ {report.totalClicks} tareas</span>
                            </div>
                            <div className="h-workers">
                                {report.workerDetails.map(w => `${w.name} (${w.clicks})`).join(', ') || 'Sin tareas'}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="no-data">No hay informes guardados todavía.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
