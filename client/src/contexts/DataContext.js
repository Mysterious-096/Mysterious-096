import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from './AuthContext';

// Create Data Context
const DataContext = createContext();

// Custom hook to use data context
export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

// Data Provider Component
export const DataProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  // Fetch drivers with pagination and search
  const fetchDrivers = async (page = 1, limit = 20, search = '') => {
    if (!isAuthenticated()) return;

    try {
      setLoading(true);
      const params = { page, limit };
      if (search) params.search = search;

      const response = await axios.get('/api/drivers', { params });
      
      setDrivers(response.data.data || []);
      setPagination({
        page: response.data.currentPage || 1,
        limit: response.data.limit || 20,
        total: response.data.total || 0,
        totalPages: response.data.totalPages || 0,
        hasMore: response.data.hasMore || false
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching drivers:', error);
      toast.error('Failed to fetch driver data');
      return { data: [], total: 0 };
    } finally {
      setLoading(false);
    }
  };

  // Search drivers
  const searchDrivers = async (searchTerm) => {
    if (!isAuthenticated() || !searchTerm.trim()) return [];

    try {
      const response = await axios.get('/api/drivers/search', {
        params: { q: searchTerm.trim() }
      });
      
      return response.data.results || [];
    } catch (error) {
      console.error('Error searching drivers:', error);
      toast.error('Search failed');
      return [];
    }
  };

  // Get driver by ID
  const getDriverById = async (driverId) => {
    if (!isAuthenticated() || !driverId) return null;

    try {
      const response = await axios.get(`/api/drivers/${driverId}`);
      return response.data.driver || null;
    } catch (error) {
      console.error('Error fetching driver:', error);
      if (error.response?.status === 404) {
        toast.error('Driver not found');
      } else {
        toast.error('Failed to fetch driver details');
      }
      return null;
    }
  };

  // Create new driver test record
  const createDriver = async (driverData) => {
    if (!isAuthenticated()) return { success: false };

    try {
      const response = await axios.post('/api/drivers', driverData);
      
      // Refresh drivers list if on first page
      if (pagination.page === 1) {
        await fetchDrivers(1, pagination.limit);
      }

      toast.success(`Driver test data saved! ID: ${response.data.driverId}`);
      return { 
        success: true, 
        driverId: response.data.driverId,
        data: response.data.data 
      };
    } catch (error) {
      console.error('Error creating driver:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to save driver data');
      return { success: false, error: error.response?.data?.error };
    }
  };

  // Upload driver photo
  const uploadDriverPhoto = async (file, driverId, driverName) => {
    if (!isAuthenticated()) return { success: false };

    try {
      const formData = new FormData();
      formData.append('photo', file);
      formData.append('driverId', driverId);
      formData.append('driverName', driverName);

      const response = await axios.post('/api/upload/driver-photo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success('Photo uploaded successfully');
      return { 
        success: true, 
        file: response.data.file 
      };
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to upload photo');
      return { success: false, error: error.response?.data?.error };
    }
  };

  // Fetch analytics data
  const fetchAnalytics = async () => {
    if (!isAuthenticated()) return;

    try {
      const response = await axios.get('/api/analytics/dashboard');
      setAnalytics(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to fetch analytics data');
      return null;
    }
  };

  // Export data as CSV
  const exportCSV = async (startDate = null, endDate = null, limit = 1000) => {
    if (!isAuthenticated()) return;

    try {
      const params = { limit };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await axios.get('/api/export/csv', {
        params,
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from response headers or use default
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'led_driver_test_data.csv';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('CSV export downloaded successfully');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Failed to export CSV');
    }
  };

  // Export driver report as PDF
  const exportDriverPDF = async (driverId) => {
    if (!isAuthenticated() || !driverId) return;

    try {
      const response = await axios.get(`/api/export/pdf/${driverId}`, {
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${driverId}_test_report.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('PDF report downloaded successfully');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export PDF report');
    }
  };

  // Get driver statistics
  const getDriverStats = async () => {
    if (!isAuthenticated()) return null;

    try {
      const response = await axios.get('/api/drivers/stats/summary');
      return response.data;
    } catch (error) {
      console.error('Error fetching driver stats:', error);
      return null;
    }
  };

  // Refresh current data
  const refreshData = async () => {
    await fetchDrivers(pagination.page, pagination.limit);
    await fetchAnalytics();
  };

  // Initialize data when authenticated
  useEffect(() => {
    if (isAuthenticated()) {
      fetchDrivers();
      fetchAnalytics();
    }
  }, [isAuthenticated]);

  // Context value
  const value = {
    // Data state
    drivers,
    loading,
    analytics,
    pagination,

    // Driver operations
    fetchDrivers,
    searchDrivers,
    getDriverById,
    createDriver,
    uploadDriverPhoto,

    // Analytics and reporting
    fetchAnalytics,
    getDriverStats,
    exportCSV,
    exportDriverPDF,

    // Utility functions
    refreshData,

    // Helper functions
    isLoading: loading,
    hasDrivers: drivers.length > 0,
    totalDrivers: pagination.total
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};