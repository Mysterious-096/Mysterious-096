const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { verifyToken, requireEngineer } = require('../middleware/auth');
const googleDriveService = require('../services/googleDrive');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');

const router = express.Router();

// Validation schemas for LED driver data
const driverValidationRules = [
  body('driverName').trim().isLength({ min: 1, max: 200 }).withMessage('Driver name is required'),
  body('serialNumber').optional().trim().isLength({ max: 100 }),
  
  // Input specifications
  body('inputVoltage').isFloat({ min: 0, max: 1000 }).withMessage('Input voltage must be between 0-1000V'),
  body('inputCurrent').isFloat({ min: 0, max: 100 }).withMessage('Input current must be between 0-100A'),
  body('inputWattage').isFloat({ min: 0, max: 10000 }).withMessage('Input wattage must be between 0-10000W'),
  body('powerFactor').isFloat({ min: 0, max: 1 }).withMessage('Power factor must be between 0-1'),
  
  // Output specifications
  body('outputVoltage').isFloat({ min: 0, max: 1000 }).withMessage('Output voltage must be between 0-1000V'),
  body('outputCurrent').isFloat({ min: 0, max: 100 }).withMessage('Output current must be between 0-100A'),
  body('outputWattage').isFloat({ min: 0, max: 10000 }).withMessage('Output wattage must be between 0-10000W'),
  body('efficiency').isFloat({ min: 0, max: 100 }).withMessage('Efficiency must be between 0-100%'),
  
  // Quality metrics
  body('thd').isFloat({ min: 0, max: 100 }).withMessage('THD must be between 0-100%'),
  body('rippleCurrent').isFloat({ min: 0 }).withMessage('Ripple current must be positive'),
  body('rippleVoltage').isFloat({ min: 0 }).withMessage('Ripple voltage must be positive'),
  
  // Safety tests
  body('surgeProtection.result').isIn(['Pass', 'Fail']).withMessage('Surge protection result must be Pass or Fail'),
  body('surgeProtection.kvLevel').optional().isFloat({ min: 0 }),
  body('highVoltageTest.result').isIn(['Pass', 'Fail']).withMessage('High voltage test result must be Pass or Fail'),
  body('highVoltageTest.conditions').optional().trim().isLength({ max: 500 }),
  body('thermalTest.result').isIn(['Pass', 'Fail']).withMessage('Thermal test result must be Pass or Fail'),
  body('thermalTest.remarks').optional().trim().isLength({ max: 1000 }),
  
  // Additional information
  body('componentDetails').optional().trim().isLength({ max: 2000 }),
  body('issues').optional().trim().isLength({ max: 1000 }),
  body('remarks').optional().trim().isLength({ max: 1000 }),
  body('testDate').isISO8601().withMessage('Test date must be a valid date')
];

/**
 * @route   POST /api/drivers
 * @desc    Create new LED driver test record
 * @access  Private (Engineers)
 */
router.post('/', [verifyToken, requireEngineer, ...driverValidationRules], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: {
          message: 'Validation failed',
          details: errors.array()
        }
      });
    }

    // Generate unique driver ID
    const driverId = `LED_${moment().format('YYYYMMDD')}_${uuidv4().substring(0, 8).toUpperCase()}`;
    
    const driverData = {
      driverId,
      ...req.body,
      testedBy: req.user.name || req.user.email,
      testedById: req.user.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save to Google Sheets
    await googleDriveService.saveToSheet(driverData);

    res.status(201).json({
      message: 'LED driver test data saved successfully',
      driverId: driverId,
      data: driverData
    });

  } catch (error) {
    console.error('Error creating driver record:', error);
    res.status(500).json({
      error: {
        message: 'Failed to save driver test data',
        details: error.message
      }
    });
  }
});

/**
 * @route   GET /api/drivers
 * @desc    Get all LED driver records with pagination
 * @access  Private
 */
router.get('/', [
  verifyToken,
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1-100'),
  query('search').optional().trim().isLength({ max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: {
          message: 'Validation failed',
          details: errors.array()
        }
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search;

    let result;
    
    if (search) {
      // Search for specific drivers
      const searchResults = await googleDriveService.searchDriverData(search);
      
      // Manual pagination for search results
      const paginatedResults = searchResults.slice(offset, offset + limit);
      
      result = {
        data: paginatedResults,
        total: searchResults.length,
        limit: limit,
        offset: offset,
        hasMore: offset + limit < searchResults.length,
        currentPage: page,
        totalPages: Math.ceil(searchResults.length / limit)
      };
    } else {
      // Get all drivers with pagination
      result = await googleDriveService.getAllDriverData(limit, offset);
      result.currentPage = page;
      result.totalPages = Math.ceil(result.total / limit);
    }

    res.json(result);

  } catch (error) {
    console.error('Error fetching driver records:', error);
    res.status(500).json({
      error: {
        message: 'Failed to fetch driver records',
        details: error.message
      }
    });
  }
});

/**
 * @route   GET /api/drivers/search
 * @desc    Search LED driver records
 * @access  Private
 */
router.get('/search', [
  verifyToken,
  query('q').trim().isLength({ min: 1, max: 100 }).withMessage('Search query is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: {
          message: 'Validation failed',
          details: errors.array()
        }
      });
    }

    const searchTerm = req.query.q;
    const results = await googleDriveService.searchDriverData(searchTerm);

    res.json({
      searchTerm: searchTerm,
      results: results,
      total: results.length
    });

  } catch (error) {
    console.error('Error searching driver records:', error);
    res.status(500).json({
      error: {
        message: 'Failed to search driver records',
        details: error.message
      }
    });
  }
});

/**
 * @route   GET /api/drivers/:driverId
 * @desc    Get specific LED driver record by ID
 * @access  Private
 */
router.get('/:driverId', verifyToken, async (req, res) => {
  try {
    const { driverId } = req.params;
    
    // Search for the specific driver
    const results = await googleDriveService.searchDriverData(driverId);
    
    if (results.length === 0) {
      return res.status(404).json({
        error: {
          message: 'Driver record not found'
        }
      });
    }

    // Find exact match
    const driver = results.find(d => d.driverId === driverId) || results[0];

    res.json({
      driver: driver
    });

  } catch (error) {
    console.error('Error fetching driver record:', error);
    res.status(500).json({
      error: {
        message: 'Failed to fetch driver record',
        details: error.message
      }
    });
  }
});

/**
 * @route   PUT /api/drivers/:driverId
 * @desc    Update LED driver record (Engineers only)
 * @access  Private (Engineers)
 */
router.put('/:driverId', [verifyToken, requireEngineer, ...driverValidationRules], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: {
          message: 'Validation failed',
          details: errors.array()
        }
      });
    }

    // Note: Google Sheets doesn't support direct updates easily
    // This would require more complex logic to find and update specific rows
    // For now, we'll return a message about the limitation
    
    res.status(501).json({
      error: {
        message: 'Update functionality not implemented with Google Sheets backend',
        details: 'Consider implementing a database backend for update operations'
      }
    });

  } catch (error) {
    console.error('Error updating driver record:', error);
    res.status(500).json({
      error: {
        message: 'Failed to update driver record',
        details: error.message
      }
    });
  }
});

/**
 * @route   DELETE /api/drivers/:driverId
 * @desc    Delete LED driver record (Engineers only)
 * @access  Private (Engineers)
 */
router.delete('/:driverId', [verifyToken, requireEngineer], async (req, res) => {
  try {
    // Note: Google Sheets doesn't support direct deletes easily
    // This would require more complex logic to find and delete specific rows
    // For now, we'll return a message about the limitation
    
    res.status(501).json({
      error: {
        message: 'Delete functionality not implemented with Google Sheets backend',
        details: 'Consider implementing a database backend for delete operations'
      }
    });

  } catch (error) {
    console.error('Error deleting driver record:', error);
    res.status(500).json({
      error: {
        message: 'Failed to delete driver record',
        details: error.message
      }
    });
  }
});

/**
 * @route   GET /api/drivers/stats/summary
 * @desc    Get summary statistics for LED driver tests
 * @access  Private
 */
router.get('/stats/summary', verifyToken, async (req, res) => {
  try {
    const allData = await googleDriveService.getAllDriverData(1000, 0); // Get more data for stats
    const drivers = allData.data;

    if (drivers.length === 0) {
      return res.json({
        totalTests: 0,
        passRate: 0,
        failRate: 0,
        averageEfficiency: 0,
        recentTests: 0
      });
    }

    // Calculate statistics
    const totalTests = drivers.length;
    
    // Count pass/fail rates based on critical tests
    const criticalTestsPassed = drivers.filter(driver => {
      const surgePass = driver.surgeProtectionResult === 'Pass';
      const hvPass = driver.highVoltageTestResult === 'Pass';
      const thermalPass = driver.thermalTestResult === 'Pass';
      return surgePass && hvPass && thermalPass;
    });

    const passRate = totalTests > 0 ? (criticalTestsPassed.length / totalTests) * 100 : 0;
    const failRate = 100 - passRate;

    // Calculate average efficiency
    const efficiencyValues = drivers
      .map(d => parseFloat(d.efficiency))
      .filter(e => !isNaN(e) && e > 0);
    
    const averageEfficiency = efficiencyValues.length > 0 
      ? efficiencyValues.reduce((sum, eff) => sum + eff, 0) / efficiencyValues.length 
      : 0;

    // Count recent tests (last 30 days)
    const thirtyDaysAgo = moment().subtract(30, 'days');
    const recentTests = drivers.filter(driver => {
      const testDate = moment(driver.testDate);
      return testDate.isAfter(thirtyDaysAgo);
    }).length;

    res.json({
      totalTests,
      passRate: Math.round(passRate * 100) / 100,
      failRate: Math.round(failRate * 100) / 100,
      averageEfficiency: Math.round(averageEfficiency * 100) / 100,
      recentTests,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error generating driver statistics:', error);
    res.status(500).json({
      error: {
        message: 'Failed to generate statistics',
        details: error.message
      }
    });
  }
});

/**
 * @route   GET /api/drivers/stats/trends
 * @desc    Get testing trends over time
 * @access  Private
 */
router.get('/stats/trends', verifyToken, async (req, res) => {
  try {
    const allData = await googleDriveService.getAllDriverData(1000, 0);
    const drivers = allData.data;

    if (drivers.length === 0) {
      return res.json({ trends: [] });
    }

    // Group by month
    const monthlyData = {};
    
    drivers.forEach(driver => {
      const month = moment(driver.testDate).format('YYYY-MM');
      
      if (!monthlyData[month]) {
        monthlyData[month] = {
          month,
          testsCount: 0,
          passCount: 0,
          totalEfficiency: 0,
          efficiencyCount: 0
        };
      }

      monthlyData[month].testsCount++;
      
      // Check if all critical tests passed
      const allPassed = driver.surgeProtectionResult === 'Pass' &&
                       driver.highVoltageTestResult === 'Pass' &&
                       driver.thermalTestResult === 'Pass';
      
      if (allPassed) {
        monthlyData[month].passCount++;
      }

      // Add efficiency data
      const efficiency = parseFloat(driver.efficiency);
      if (!isNaN(efficiency) && efficiency > 0) {
        monthlyData[month].totalEfficiency += efficiency;
        monthlyData[month].efficiencyCount++;
      }
    });

    // Convert to array and calculate averages
    const trends = Object.values(monthlyData)
      .map(data => ({
        month: data.month,
        testsCount: data.testsCount,
        passRate: data.testsCount > 0 ? (data.passCount / data.testsCount) * 100 : 0,
        averageEfficiency: data.efficiencyCount > 0 
          ? data.totalEfficiency / data.efficiencyCount 
          : 0
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    res.json({
      trends: trends,
      totalMonths: trends.length,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error generating trend data:', error);
    res.status(500).json({
      error: {
        message: 'Failed to generate trend data',
        details: error.message
      }
    });
  }
});

module.exports = router;