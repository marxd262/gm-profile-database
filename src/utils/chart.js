/**
 * Chart.js utilities for profile visualization
 * Ported from Gaggimate ExtendedProfileChart.jsx
 */

/**
 * Prepares phase data into chart-compatible data points
 * Generates data points at 0.1s intervals with easing transitions
 * 
 * @param {Array} phases - Profile phases array
 * @param {string} target - 'pressure' or 'flow'
 * @returns {Array} Data points [{time, value}]
 */
export function prepareData(phases, target) {
  const dataPoints = [];
  let currentTime = 0;
  const interval = 0.1; // 100ms intervals

  phases.forEach((phase, phaseIndex) => {
    const duration = phase.duration || 0;
    const targetValue = phase.pump?.[target] || 0;
    
    // Previous phase value (for transitions)
    const prevValue = phaseIndex > 0 
      ? phases[phaseIndex - 1].pump?.[target] || 0 
      : 0;

    // Transition settings
    const transition = phase.transition || {};
    const transitionDuration = transition.duration || 0;
    const easing = transition.easing || 'linear';

    // Generate points during transition
    if (transitionDuration > 0) {
      const transitionSteps = Math.ceil(transitionDuration / interval);
      for (let i = 0; i <= transitionSteps; i++) {
        const t = i / transitionSteps;
        const easedT = applyEasing(t, easing);
        const value = prevValue + (targetValue - prevValue) * easedT;
        dataPoints.push({ time: parseFloat(currentTime.toFixed(1)), value: parseFloat(value.toFixed(2)) });
        currentTime += interval;
      }
    }

    // Generate points during phase (after transition)
    const remainingDuration = duration - transitionDuration;
    if (remainingDuration > 0) {
      const steps = Math.ceil(remainingDuration / interval);
      for (let i = 0; i <= steps; i++) {
        dataPoints.push({ time: parseFloat(currentTime.toFixed(1)), value: parseFloat(targetValue.toFixed(2)) });
        currentTime += interval;
      }
    }
  });

  return dataPoints;
}

/**
 * Applies easing function to time value
 * 
 * @param {number} t - Time value (0-1)
 * @param {string} easing - Easing function name
 * @returns {number} Eased value
 */
export function applyEasing(t, easing) {
  switch (easing) {
    case 'linear':
      return t;
    case 'ease-in':
      return t * t;
    case 'ease-out':
      return 1 - (1 - t) * (1 - t);
    case 'ease-in-out':
      return t < 0.5
        ? 2 * t * t
        : 1 - Math.pow(-2 * t + 2, 2) / 2;
    default:
      return t;
  }
}

/**
 * Calculates phase boundary times for chart annotations
 * 
 * @param {Array} phases - Profile phases array
 * @returns {Array} Phase boundaries [{time, name, phase}]
 */
export function calculatePhaseBoundaries(phases) {
  const boundaries = [];
  let cumulativeTime = 0;
  
  phases.forEach((phase, index) => {
    const duration = phase.duration || 0;
    const transitionDuration = phase.transition?.duration || 0;
    const totalPhaseTime = duration + transitionDuration;
    
    cumulativeTime += totalPhaseTime;
    boundaries.push({
      time: parseFloat(cumulativeTime.toFixed(1)),
      name: phase.name || `Phase ${index + 1}`,
      phase: phase.phase || 'brew',
      index: index
    });
  });
  
  return boundaries;
}

/**
 * Creates Chart.js annotation configuration for phase boundaries
 * 
 * @param {Array} boundaries - Phase boundaries from calculatePhaseBoundaries
 * @returns {Object} Annotation plugin configuration
 */
export function createPhaseAnnotations(boundaries) {
  const annotations = {};
  
  boundaries.forEach((boundary, index) => {
    const isPreinfusion = boundary.phase === 'preinfusion';
    const color = isPreinfusion ? 'rgba(251, 191, 36, 0.7)' : 'rgba(59, 130, 246, 0.7)';
    const bgColor = isPreinfusion ? 'rgba(251, 191, 36, 0.15)' : 'rgba(59, 130, 246, 0.15)';
    
    // Vertical line at phase boundary
    annotations[`line${index}`] = {
      type: 'line',
      xMin: boundary.time,
      xMax: boundary.time,
      borderColor: color,
      borderWidth: 2,
      borderDash: [6, 4],
      label: {
        display: true,
        content: boundary.name,
        position: 'start',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        font: { size: 10 },
        rotation: 0,
        yAdjust: -10
      }
    };
    
    // Background box for phase region (except last phase)
    if (index > 0) {
      const prevBoundary = boundaries[index - 1];
      annotations[`box${index}`] = {
        type: 'box',
        xMin: prevBoundary.time,
        xMax: boundary.time,
        backgroundColor: bgColor,
        borderWidth: 0
      };
    }
  });
  
  return annotations;
}

/**
 * Creates Chart.js configuration from profile data
 * 
 * @param {Object} profileData - Complete profile data with phases
 * @returns {Object} Chart.js config object
 */
export function makeChartData(profileData) {
  const pressureData = prepareData(profileData.phases, 'pressure');
  const flowData = prepareData(profileData.phases, 'flow');
  
  // Calculate phase annotations
  const boundaries = calculatePhaseBoundaries(profileData.phases);
  const annotations = createPhaseAnnotations(boundaries);

  return {
    type: 'line',
    data: {
      datasets: [
        {
          label: 'Pressure (bar)',
          data: pressureData.map(p => ({ x: p.time, y: p.value })),
          borderColor: 'rgb(59, 130, 246)', // Blue
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          yAxisID: 'y-pressure',
          pointRadius: 0,
          tension: 0,
        },
        {
          label: 'Flow (ml/s)',
          data: flowData.map(p => ({ x: p.time, y: p.value })),
          borderColor: 'rgb(16, 185, 129)', // Green
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderWidth: 2,
          borderDash: [5, 5],
          yAxisID: 'y-flow',
          pointRadius: 0,
          tension: 0,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false, // Disable all animations
      animations: {
        tension: { duration: 0 },
        x: { duration: 0 },
        y: { duration: 0 }
      },
      transitions: {
        active: { animation: { duration: 0 } }
      },
      interaction: {
        mode: 'index',
        intersect: false,
      },
      scales: {
        x: {
          type: 'linear',
          title: { 
            display: true, 
            text: 'Time (seconds)',
            font: { size: 12 }
          },
          ticks: { 
            stepSize: 5,
            font: { size: 11 }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          }
        },
        'y-pressure': {
          type: 'linear',
          position: 'left',
          title: { 
            display: true, 
            text: 'Pressure (bar)',
            font: { size: 12 }
          },
          min: 0,
          max: 12,
          ticks: { 
            stepSize: 2,
            font: { size: 11 }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          }
        },
        'y-flow': {
          type: 'linear',
          position: 'right',
          title: { 
            display: true, 
            text: 'Flow (ml/s)',
            font: { size: 12 }
          },
          min: 0,
          max: 10,
          ticks: { 
            stepSize: 2,
            font: { size: 11 }
          },
          grid: { 
            drawOnChartArea: false 
          }
        }
      },
      plugins: {
        legend: { 
          display: true, 
          position: 'top',
          labels: {
            font: { size: 12 },
            usePointStyle: true,
          }
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            label: (context) => {
              const label = context.dataset.label || '';
              const value = context.parsed.y.toFixed(1);
              return `${label}: ${value}`;
            }
          }
        },
        annotation: {
          annotations: annotations
        }
      }
    }
  };
}
