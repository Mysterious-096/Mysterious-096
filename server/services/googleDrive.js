const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');

class GoogleDriveService {
  constructor() {
    this.auth = new google.auth.OAuth2(
      process.env.GOOGLE_DRIVE_CLIENT_ID,
      process.env.GOOGLE_DRIVE_CLIENT_SECRET,
      process.env.GOOGLE_DRIVE_REDIRECT_URI
    );

    this.auth.setCredentials({
      refresh_token: process.env.GOOGLE_DRIVE_REFRESH_TOKEN
    });

    this.drive = google.drive({ version: 'v3', auth: this.auth });
    this.sheets = google.sheets({ version: 'v4', auth: this.auth });
    
    this.spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    this.folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  }

  /**
   * Upload file to Google Drive
   * @param {Buffer} fileBuffer - File buffer
   * @param {string} fileName - Name of the file
   * @param {string} mimeType - MIME type of the file
   * @param {string} driverId - LED driver ID for organization
   */
  async uploadFile(fileBuffer, fileName, mimeType, driverId) {
    try {
      // Create driver-specific folder if it doesn't exist
      const driverFolderId = await this.createDriverFolder(driverId);

      const fileMetadata = {
        name: fileName,
        parents: [driverFolderId]
      };

      const media = {
        mimeType: mimeType,
        body: require('stream').Readable.from(fileBuffer)
      };

      const response = await this.drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id,name,webViewLink,webContentLink'
      });

      // Make file publicly viewable (for internal use)
      await this.drive.permissions.create({
        fileId: response.data.id,
        resource: {
          role: 'reader',
          type: 'anyone'
        }
      });

      return {
        fileId: response.data.id,
        fileName: response.data.name,
        webViewLink: response.data.webViewLink,
        webContentLink: response.data.webContentLink
      };
    } catch (error) {
      console.error('Error uploading file to Google Drive:', error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  /**
   * Create or get driver-specific folder
   * @param {string} driverId - LED driver ID
   */
  async createDriverFolder(driverId) {
    try {
      // Check if folder already exists
      const query = `name='${driverId}' and '${this.folderId}' in parents and mimeType='application/vnd.google-apps.folder'`;
      const existingFolders = await this.drive.files.list({
        q: query,
        fields: 'files(id, name)'
      });

      if (existingFolders.data.files.length > 0) {
        return existingFolders.data.files[0].id;
      }

      // Create new folder
      const folderMetadata = {
        name: driverId,
        parents: [this.folderId],
        mimeType: 'application/vnd.google-apps.folder'
      };

      const folder = await this.drive.files.create({
        resource: folderMetadata,
        fields: 'id'
      });

      return folder.data.id;
    } catch (error) {
      console.error('Error creating driver folder:', error);
      throw new Error(`Failed to create driver folder: ${error.message}`);
    }
  }

  /**
   * Save driver test data to Google Sheets
   * @param {object} driverData - Complete driver test data
   */
  async saveToSheet(driverData) {
    try {
      const values = [
        [
          driverData.driverId,
          driverData.driverName,
          driverData.serialNumber || '',
          // Input specifications
          driverData.inputVoltage,
          driverData.inputCurrent,
          driverData.inputWattage,
          driverData.powerFactor,
          // Output specifications
          driverData.outputVoltage,
          driverData.outputCurrent,
          driverData.outputWattage,
          driverData.efficiency,
          // Quality metrics
          driverData.thd,
          driverData.rippleCurrent,
          driverData.rippleVoltage,
          // Safety tests
          driverData.surgeProtection.result,
          driverData.surgeProtection.kvLevel || '',
          driverData.highVoltageTest.result,
          driverData.highVoltageTest.conditions || '',
          driverData.thermalTest.result,
          driverData.thermalTest.remarks || '',
          // Additional info
          driverData.componentDetails || '',
          driverData.issues || '',
          driverData.remarks || '',
          // Metadata
          driverData.testedBy,
          new Date(driverData.testDate).toISOString(),
          driverData.photoUrl || '',
          new Date().toISOString() // Created timestamp
        ]
      ];

      const range = 'Driver_Tests!A:AA'; // Adjust range as needed

      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: range,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        resource: {
          values: values
        }
      });

      return { success: true, message: 'Data saved to Google Sheets' };
    } catch (error) {
      console.error('Error saving to Google Sheets:', error);
      throw new Error(`Failed to save to Google Sheets: ${error.message}`);
    }
  }

  /**
   * Initialize Google Sheets with headers if not exists
   */
  async initializeSheet() {
    try {
      const headers = [
        'Driver ID',
        'Driver Name',
        'Serial Number',
        'Input Voltage (V)',
        'Input Current (A)',
        'Input Wattage (W)',
        'Power Factor',
        'Output Voltage (V)',
        'Output Current (A)',
        'Output Wattage (W)',
        'Efficiency (%)',
        'THD (%)',
        'Ripple Current (mA)',
        'Ripple Voltage (mV)',
        'Surge Protection Result',
        'Surge Protection kV Level',
        'High Voltage Test Result',
        'High Voltage Test Conditions',
        'Thermal Test Result',
        'Thermal Test Remarks',
        'Component Details',
        'Issues',
        'Remarks',
        'Tested By',
        'Test Date',
        'Photo URL',
        'Created At'
      ];

      // Check if sheet exists and has headers
      try {
        const response = await this.sheets.spreadsheets.values.get({
          spreadsheetId: this.spreadsheetId,
          range: 'Driver_Tests!A1:AA1'
        });

        if (!response.data.values || response.data.values.length === 0) {
          // Add headers
          await this.sheets.spreadsheets.values.update({
            spreadsheetId: this.spreadsheetId,
            range: 'Driver_Tests!A1:AA1',
            valueInputOption: 'RAW',
            resource: {
              values: [headers]
            }
          });
        }
      } catch (error) {
        if (error.code === 400) {
          // Sheet doesn't exist, create it
          await this.sheets.spreadsheets.batchUpdate({
            spreadsheetId: this.spreadsheetId,
            resource: {
              requests: [{
                addSheet: {
                  properties: {
                    title: 'Driver_Tests'
                  }
                }
              }]
            }
          });

          // Add headers to new sheet
          await this.sheets.spreadsheets.values.update({
            spreadsheetId: this.spreadsheetId,
            range: 'Driver_Tests!A1:AA1',
            valueInputOption: 'RAW',
            resource: {
              values: [headers]
            }
          });
        } else {
          throw error;
        }
      }

      return { success: true, message: 'Sheet initialized successfully' };
    } catch (error) {
      console.error('Error initializing Google Sheets:', error);
      throw new Error(`Failed to initialize Google Sheets: ${error.message}`);
    }
  }

  /**
   * Search driver data in Google Sheets
   * @param {string} searchTerm - Driver ID or name to search
   */
  async searchDriverData(searchTerm) {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Driver_Tests!A:AA'
      });

      if (!response.data.values || response.data.values.length <= 1) {
        return [];
      }

      const headers = response.data.values[0];
      const rows = response.data.values.slice(1);

      const results = rows.filter(row => {
        const driverId = row[0] || '';
        const driverName = row[1] || '';
        const serialNumber = row[2] || '';
        
        return driverId.toLowerCase().includes(searchTerm.toLowerCase()) ||
               driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
               serialNumber.toLowerCase().includes(searchTerm.toLowerCase());
      });

      return results.map(row => {
        const data = {};
        headers.forEach((header, index) => {
          data[this.camelCase(header)] = row[index] || '';
        });
        return data;
      });
    } catch (error) {
      console.error('Error searching driver data:', error);
      throw new Error(`Failed to search driver data: ${error.message}`);
    }
  }

  /**
   * Get all driver data with pagination
   * @param {number} limit - Number of records to return
   * @param {number} offset - Number of records to skip
   */
  async getAllDriverData(limit = 50, offset = 0) {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Driver_Tests!A:AA'
      });

      if (!response.data.values || response.data.values.length <= 1) {
        return { data: [], total: 0 };
      }

      const headers = response.data.values[0];
      const allRows = response.data.values.slice(1);
      const totalRows = allRows.length;

      // Apply pagination
      const startIndex = offset;
      const endIndex = offset + limit;
      const paginatedRows = allRows.slice(startIndex, endIndex);

      const data = paginatedRows.map(row => {
        const rowData = {};
        headers.forEach((header, index) => {
          rowData[this.camelCase(header)] = row[index] || '';
        });
        return rowData;
      });

      return {
        data: data,
        total: totalRows,
        limit: limit,
        offset: offset,
        hasMore: endIndex < totalRows
      };
    } catch (error) {
      console.error('Error getting all driver data:', error);
      throw new Error(`Failed to get driver data: ${error.message}`);
    }
  }

  /**
   * Delete file from Google Drive
   * @param {string} fileId - Google Drive file ID
   */
  async deleteFile(fileId) {
    try {
      await this.drive.files.delete({
        fileId: fileId
      });
      return { success: true, message: 'File deleted successfully' };
    } catch (error) {
      console.error('Error deleting file from Google Drive:', error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * Convert string to camelCase for object keys
   * @param {string} str - String to convert
   */
  camelCase(str) {
    return str
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
        return index === 0 ? word.toLowerCase() : word.toUpperCase();
      })
      .replace(/\s+/g, '')
      .replace(/[()%]/g, '');
  }
}

module.exports = new GoogleDriveService();