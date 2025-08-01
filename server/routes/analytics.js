const express = require('express');
const { verifyToken } = require('../middleware/auth');
const googleDriveService = require('../services/googleDrive');
const moment = require('moment');

const router = express.Router();

/**
 * @route   GET /api/analytics/dashboard
 * @desc    Get dashboard analytics data
 * @access  Private
 */
router.get('/dashboard', verifyToken, async (req, res) => {
  try {
    // Get all driver data for analysis
    const allData = await googleDriveService.getAllDriverData(1000, 0);
    const drivers = allData.data;

    if (drivers.length === 0) {
      return res.json({
        totalTests: 0,
        passRate: 0,
        averageEfficiency: 0,
        recentTests: 0,
        monthlyTrends: [],
        testBreakdown: {
          surge: { pass: 0, fail: 0 },
          highVoltage: { pass: 0, fail: 0 },
          thermal: { pass: 0, fail: 0 }
        },
        efficiencyDistribution: [],
        topIssues: []
      });
    }

    // Basic statistics
    const totalTests = drivers.length;
    const passedTests = drivers.filter(d => 
      d.surgeProtectionResult === 'Pass' &&
      d.highVoltageTestResult === 'Pass' &&
      d.thermalTestResult === 'Pass'
    ).length;
    
    const passRate = (passedTests / totalTests) * 100;
    
    // Calculate average efficiency
    const efficiencyValues = drivers
      .map(d => parseFloat(d.efficiency))
      .filter(e => !isNaN(e) && e > 0);
    
    const averageEfficiency = efficiencyValues.length > 0 
      ? efficiencyValues.reduce((sum, eff) => sum + eff, 0) / efficiencyValues.length 
      : 0;

    // Recent tests (last 30 days)
    const thirtyDaysAgo = moment().subtract(30, 'days');
    const recentTests = drivers.filter(d => 
      moment(d.testDate).isAfter(thirtyDaysAgo)
    ).length;

    // Monthly trends (last 12 months)
    const monthlyTrends = [];
    for (let i = 11; i >= 0; i--) {
      const month = moment().subtract(i, 'months');
      const monthStart = month.clone().startOf('month');
      const monthEnd = month.clone().endOf('month');
      
      const monthlyDrivers = drivers.filter(d => {
        const testDate = moment(d.testDate);
        return testDate.isBetween(monthStart, monthEnd, null, '[]');
      });
      
      const monthlyPassed = monthlyDrivers.filter(d =>
        d.surgeProtectionResult === 'Pass' &&
        d.highVoltageTestResult === 'Pass' &&
        d.thermalTestResult === 'Pass'
      ).length;
      
      const monthlyEfficiency = monthlyDrivers
        .map(d => parseFloat(d.efficiency))
        .filter(e => !isNaN(e) && e > 0);
      
      const avgMonthlyEfficiency = monthlyEfficiency.length > 0
        ? monthlyEfficiency.reduce((sum, eff) => sum + eff, 0) / monthlyEfficiency.length
        : 0;

      monthlyTrends.push({
        month: month.format('MMM YYYY'),
        totalTests: monthlyDrivers.length,
        passedTests: monthlyPassed,
        passRate: monthlyDrivers.length > 0 ? (monthlyPassed / monthlyDrivers.length) * 100 : 0,
        averageEfficiency: Math.round(avgMonthlyEfficiency * 100) / 100
      });
    }

    // Test breakdown
    const testBreakdown = {
      surge: {
        pass: drivers.filter(d => d.surgeProtectionResult === 'Pass').length,
        fail: drivers.filter(d => d.surgeProtectionResult === 'Fail').length
      },
      highVoltage: {
        pass: drivers.filter(d => d.highVoltageTestResult === 'Pass').length,
        fail: drivers.filter(d => d.highVoltageTestResult === 'Fail').length
      },
      thermal: {
        pass: drivers.filter(d => d.thermalTestResult === 'Pass').length,
        fail: drivers.filter(d => d.thermalTestResult === 'Fail').length
      }
    };

    // Efficiency distribution
    const efficiencyRanges = [
      { min: 0, max: 70, label: '0-70%' },
      { min: 70, max: 80, label: '70-80%' },
      { min: 80, max: 85, label: '80-85%' },
      { min: 85, max: 90, label: '85-90%' },
      { min: 90, max: 95, label: '90-95%' },
      { min: 95, max: 100, label: '95-100%' }
    ];

    const efficiencyDistribution = efficiencyRanges.map(range => ({
      range: range.label,
      count: efficiencyValues.filter(eff => eff >= range.min && eff < range.max).length
    }));

    // Top issues analysis
    const issuesMap = {};
    drivers.forEach(d => {
      if (d.issues && d.issues.trim()) {
        const issues = d.issues.toLowerCase().trim();
        issuesMap[issues] = (issuesMap[issues] || 0) + 1;
      }
    });

    const topIssues = Object.entries(issuesMap)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([issue, count]) => ({ issue, count }));

    res.json({
      totalTests,
      passedTests,
      failedTests: totalTests - passedTests,
      passRate: Math.round(passRate * 100) / 100,
      averageEfficiency: Math.round(averageEfficiency * 100) / 100,
      recentTests,
      monthlyTrends,
      testBreakdown,
      efficiencyDistribution,
      topIssues,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Dashboard analytics error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to generate dashboard analytics',
        details: error.message
      }
    });
  }
});

/**
 * @route   GET /api/analytics/efficiency-trends
 * @desc    Get efficiency trends over time
 * @access  Private
 */
router.get('/efficiency-trends', verifyToken, async (req, res) => {
  try {
    const { period = 'month', limit = 12 } = req.query;
    
    const allData = await googleDriveService.getAllDriverData(1000, 0);
    const drivers = allData.data;

    if (drivers.length === 0) {
      return res.json({ trends: [] });
    }

    const trends = [];
    const limitNum = parseInt(limit);

    for (let i = limitNum - 1; i >= 0; i--) {
      let periodMoment, periodStart, periodEnd, formatString;
      
      if (period === 'week') {
        periodMoment = moment().subtract(i, 'weeks');
        periodStart = periodMoment.clone().startOf('week');
        periodEnd = periodMoment.clone().endOf('week');
        formatString = 'MMM DD';
      } else if (period === 'day') {
        periodMoment = moment().subtract(i, 'days');
        periodStart = periodMoment.clone().startOf('day');
        periodEnd = periodMoment.clone().endOf('day');
        formatString = 'MMM DD';
      } else { // month (default)
        periodMoment = moment().subtract(i, 'months');
        periodStart = periodMoment.clone().startOf('month');
        periodEnd = periodMoment.clone().endOf('month');
        formatString = 'MMM YYYY';
      }
      
      const periodDrivers = drivers.filter(d => {
        const testDate = moment(d.testDate);
        return testDate.isBetween(periodStart, periodEnd, null, '[]');
      });
      
      if (periodDrivers.length > 0) {
        const efficiencyValues = periodDrivers
          .map(d => parseFloat(d.efficiency))
          .filter(e => !isNaN(e) && e > 0);
        
        if (efficiencyValues.length > 0) {
          const avgEfficiency = efficiencyValues.reduce((sum, eff) => sum + eff, 0) / efficiencyValues.length;
          const minEfficiency = Math.min(...efficiencyValues);
          const maxEfficiency = Math.max(...efficiencyValues);
          
          trends.push({
            period: periodMoment.format(formatString),
            averageEfficiency: Math.round(avgEfficiency * 100) / 100,
            minEfficiency: Math.round(minEfficiency * 100) / 100,
            maxEfficiency: Math.round(maxEfficiency * 100) / 100,
            testCount: periodDrivers.length,
            dataPoints: efficiencyValues.length
          });
        }
      }
    }

    res.json({
      period,
      trends,
      totalPeriods: trends.length,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Efficiency trends error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to generate efficiency trends',
        details: error.message
      }
    });
  }
});

/**
 * @route   GET /api/analytics/failure-analysis
 * @desc    Get detailed failure analysis
 * @access  Private
 */
router.get('/failure-analysis', verifyToken, async (req, res) => {
  try {
    const allData = await googleDriveService.getAllDriverData(1000, 0);
    const drivers = allData.data;

    if (drivers.length === 0) {
      return res.json({
        totalFailures: 0,
        failuresByTest: {},
        failuresByMonth: [],
        commonIssues: [],
        failureRate: 0
      });
    }

    // Identify failed tests
    const failedDrivers = drivers.filter(d => 
      d.surgeProtectionResult === 'Fail' ||
      d.highVoltageTestResult === 'Fail' ||
      d.thermalTestResult === 'Fail'
    );

    const totalFailures = failedDrivers.length;
    const failureRate = (totalFailures / drivers.length) * 100;

    // Failures by test type
    const failuresByTest = {
      surgeProtection: drivers.filter(d => d.surgeProtectionResult === 'Fail').length,
      highVoltage: drivers.filter(d => d.highVoltageTestResult === 'Fail').length,
      thermal: drivers.filter(d => d.thermalTestResult === 'Fail').length
    };

    // Failures by month (last 12 months)
    const failuresByMonth = [];
    for (let i = 11; i >= 0; i--) {
      const month = moment().subtract(i, 'months');
      const monthStart = month.clone().startOf('month');
      const monthEnd = month.clone().endOf('month');
      
      const monthlyDrivers = drivers.filter(d => {
        const testDate = moment(d.testDate);
        return testDate.isBetween(monthStart, monthEnd, null, '[]');
      });
      
      const monthlyFailures = monthlyDrivers.filter(d =>
        d.surgeProtectionResult === 'Fail' ||
        d.highVoltageTestResult === 'Fail' ||
        d.thermalTestResult === 'Fail'
      ).length;
      
      failuresByMonth.push({
        month: month.format('MMM YYYY'),
        totalTests: monthlyDrivers.length,
        failures: monthlyFailures,
        failureRate: monthlyDrivers.length > 0 ? (monthlyFailures / monthlyDrivers.length) * 100 : 0
      });
    }

    // Common issues from failed drivers
    const issuesMap = {};
    failedDrivers.forEach(d => {
      if (d.issues && d.issues.trim()) {
        const issues = d.issues.toLowerCase().trim();
        issuesMap[issues] = (issuesMap[issues] || 0) + 1;
      }
    });

    const commonIssues = Object.entries(issuesMap)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([issue, count]) => ({ 
        issue, 
        count, 
        percentage: Math.round((count / totalFailures) * 100 * 100) / 100 
      }));

    // Failure patterns
    const failurePatterns = {
      surgeOnly: drivers.filter(d => 
        d.surgeProtectionResult === 'Fail' &&
        d.highVoltageTestResult === 'Pass' &&
        d.thermalTestResult === 'Pass'
      ).length,
      hvOnly: drivers.filter(d => 
        d.surgeProtectionResult === 'Pass' &&
        d.highVoltageTestResult === 'Fail' &&
        d.thermalTestResult === 'Pass'
      ).length,
      thermalOnly: drivers.filter(d => 
        d.surgeProtectionResult === 'Pass' &&
        d.highVoltageTestResult === 'Pass' &&
        d.thermalTestResult === 'Fail'
      ).length,
      multiple: drivers.filter(d => {
        const failCount = [
          d.surgeProtectionResult === 'Fail',
          d.highVoltageTestResult === 'Fail',
          d.thermalTestResult === 'Fail'
        ].filter(Boolean).length;
        return failCount > 1;
      }).length
    };

    res.json({
      totalFailures,
      failureRate: Math.round(failureRate * 100) / 100,
      failuresByTest,
      failuresByMonth,
      commonIssues,
      failurePatterns,
      analysisDate: new Date().toISOString()
    });

  } catch (error) {
    console.error('Failure analysis error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to generate failure analysis',
        details: error.message
      }
    });
  }
});

/**
 * @route   GET /api/analytics/engineer-performance
 * @desc    Get engineer performance statistics
 * @access  Private
 */
router.get('/engineer-performance', verifyToken, async (req, res) => {
  try {
    const allData = await googleDriveService.getAllDriverData(1000, 0);
    const drivers = allData.data;

    if (drivers.length === 0) {
      return res.json({ engineers: [] });
    }

    // Group by engineer
    const engineerStats = {};
    
    drivers.forEach(d => {
      const engineer = d.testedBy || 'Unknown';
      
      if (!engineerStats[engineer]) {
        engineerStats[engineer] = {
          name: engineer,
          totalTests: 0,
          passedTests: 0,
          failedTests: 0,
          passRate: 0,
          efficiencySum: 0,
          efficiencyCount: 0,
          averageEfficiency: 0,
          recentTests: 0
        };
      }

      const stats = engineerStats[engineer];
      stats.totalTests++;

      // Check if test passed
      const testPassed = d.surgeProtectionResult === 'Pass' &&
                        d.highVoltageTestResult === 'Pass' &&
                        d.thermalTestResult === 'Pass';
      
      if (testPassed) {
        stats.passedTests++;
      } else {
        stats.failedTests++;
      }

      // Add efficiency data
      const efficiency = parseFloat(d.efficiency);
      if (!isNaN(efficiency) && efficiency > 0) {
        stats.efficiencySum += efficiency;
        stats.efficiencyCount++;
      }

      // Check if recent (last 30 days)
      if (moment(d.testDate).isAfter(moment().subtract(30, 'days'))) {
        stats.recentTests++;
      }
    });

    // Calculate final statistics
    const engineers = Object.values(engineerStats).map(stats => ({
      ...stats,
      passRate: stats.totalTests > 0 ? Math.round((stats.passedTests / stats.totalTests) * 100 * 100) / 100 : 0,
      averageEfficiency: stats.efficiencyCount > 0 ? Math.round((stats.efficiencySum / stats.efficiencyCount) * 100) / 100 : 0
    })).sort((a, b) => b.totalTests - a.totalTests);

    res.json({
      engineers,
      totalEngineers: engineers.length,
      reportDate: new Date().toISOString()
    });

  } catch (error) {
    console.error('Engineer performance error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to generate engineer performance data',
        details: error.message
      }
    });
  }
});

/**
 * @route   GET /api/analytics/quality-metrics
 * @desc    Get detailed quality metrics analysis
 * @access  Private
 */
router.get('/quality-metrics', verifyToken, async (req, res) => {
  try {
    const allData = await googleDriveService.getAllDriverData(1000, 0);
    const drivers = allData.data;

    if (drivers.length === 0) {
      return res.json({
        efficiency: {},
        thd: {},
        ripple: {},
        qualityTrends: []
      });
    }

    // Efficiency analysis
    const efficiencyValues = drivers
      .map(d => parseFloat(d.efficiency))
      .filter(e => !isNaN(e) && e > 0);

    const efficiency = {
      average: efficiencyValues.length > 0 ? efficiencyValues.reduce((sum, e) => sum + e, 0) / efficiencyValues.length : 0,
      min: efficiencyValues.length > 0 ? Math.min(...efficiencyValues) : 0,
      max: efficiencyValues.length > 0 ? Math.max(...efficiencyValues) : 0,
      standardDeviation: 0,
      distribution: {}
    };

    // Calculate standard deviation
    if (efficiencyValues.length > 1) {
      const variance = efficiencyValues.reduce((sum, e) => sum + Math.pow(e - efficiency.average, 2), 0) / efficiencyValues.length;
      efficiency.standardDeviation = Math.sqrt(variance);
    }

    // THD analysis
    const thdValues = drivers
      .map(d => parseFloat(d.thd))
      .filter(t => !isNaN(t) && t >= 0);

    const thd = {
      average: thdValues.length > 0 ? thdValues.reduce((sum, t) => sum + t, 0) / thdValues.length : 0,
      min: thdValues.length > 0 ? Math.min(...thdValues) : 0,
      max: thdValues.length > 0 ? Math.max(...thdValues) : 0,
      underLimit: thdValues.filter(t => t <= 5).length, // Assuming 5% is the limit
      overLimit: thdValues.filter(t => t > 5).length
    };

    // Ripple analysis
    const rippleCurrentValues = drivers
      .map(d => parseFloat(d.rippleCurrent))
      .filter(r => !isNaN(r) && r >= 0);

    const rippleVoltageValues = drivers
      .map(d => parseFloat(d.rippleVoltage))
      .filter(r => !isNaN(r) && r >= 0);

    const ripple = {
      current: {
        average: rippleCurrentValues.length > 0 ? rippleCurrentValues.reduce((sum, r) => sum + r, 0) / rippleCurrentValues.length : 0,
        min: rippleCurrentValues.length > 0 ? Math.min(...rippleCurrentValues) : 0,
        max: rippleCurrentValues.length > 0 ? Math.max(...rippleCurrentValues) : 0
      },
      voltage: {
        average: rippleVoltageValues.length > 0 ? rippleVoltageValues.reduce((sum, r) => sum + r, 0) / rippleVoltageValues.length : 0,
        min: rippleVoltageValues.length > 0 ? Math.min(...rippleVoltageValues) : 0,
        max: rippleVoltageValues.length > 0 ? Math.max(...rippleVoltageValues) : 0
      }
    };

    // Quality trends over last 6 months
    const qualityTrends = [];
    for (let i = 5; i >= 0; i--) {
      const month = moment().subtract(i, 'months');
      const monthStart = month.clone().startOf('month');
      const monthEnd = month.clone().endOf('month');
      
      const monthlyDrivers = drivers.filter(d => {
        const testDate = moment(d.testDate);
        return testDate.isBetween(monthStart, monthEnd, null, '[]');
      });
      
      if (monthlyDrivers.length > 0) {
        const monthlyEfficiency = monthlyDrivers
          .map(d => parseFloat(d.efficiency))
          .filter(e => !isNaN(e) && e > 0);
        
        const monthlyThd = monthlyDrivers
          .map(d => parseFloat(d.thd))
          .filter(t => !isNaN(t) && t >= 0);
        
        qualityTrends.push({
          month: month.format('MMM YYYY'),
          averageEfficiency: monthlyEfficiency.length > 0 ? monthlyEfficiency.reduce((sum, e) => sum + e, 0) / monthlyEfficiency.length : 0,
          averageThd: monthlyThd.length > 0 ? monthlyThd.reduce((sum, t) => sum + t, 0) / monthlyThd.length : 0,
          testCount: monthlyDrivers.length
        });
      }
    }

    // Round all numeric values
    const roundedData = {
      efficiency: {
        ...efficiency,
        average: Math.round(efficiency.average * 100) / 100,
        min: Math.round(efficiency.min * 100) / 100,
        max: Math.round(efficiency.max * 100) / 100,
        standardDeviation: Math.round(efficiency.standardDeviation * 100) / 100
      },
      thd: {
        ...thd,
        average: Math.round(thd.average * 100) / 100,
        min: Math.round(thd.min * 100) / 100,
        max: Math.round(thd.max * 100) / 100
      },
      ripple: {
        current: {
          ...ripple.current,
          average: Math.round(ripple.current.average * 100) / 100,
          min: Math.round(ripple.current.min * 100) / 100,
          max: Math.round(ripple.current.max * 100) / 100
        },
        voltage: {
          ...ripple.voltage,
          average: Math.round(ripple.voltage.average * 100) / 100,
          min: Math.round(ripple.voltage.min * 100) / 100,
          max: Math.round(ripple.voltage.max * 100) / 100
        }
      },
      qualityTrends: qualityTrends.map(trend => ({
        ...trend,
        averageEfficiency: Math.round(trend.averageEfficiency * 100) / 100,
        averageThd: Math.round(trend.averageThd * 100) / 100
      })),
      analysisDate: new Date().toISOString()
    };

    res.json(roundedData);

  } catch (error) {
    console.error('Quality metrics error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to generate quality metrics',
        details: error.message
      }
    });
  }
});

module.exports = router;