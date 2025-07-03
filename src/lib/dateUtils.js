// Utility function to safely convert Firebase Timestamp to Date
export const safeToDate = (timestamp) => {
  if (!timestamp) return null;
  
  try {
    // Firebase Timestamp
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    
    // Already a Date object
    if (timestamp instanceof Date) {
      return timestamp;
    }
    
    // String date
    if (typeof timestamp === 'string') {
      return new Date(timestamp);
    }
    
    // Number timestamp
    if (typeof timestamp === 'number') {
      return new Date(timestamp);
    }
    
    // Fallback
    return new Date();
  } catch (error) {
    console.warn('Error converting timestamp:', error);
    return new Date();
  }
};

// Format date to ISO string safely
export const safeToISOString = (timestamp) => {
  const date = safeToDate(timestamp);
  return date ? date.toISOString() : new Date().toISOString();
};

// Format date to date part only (YYYY-MM-DD)
export const safeToDateString = (timestamp) => {
  const date = safeToDate(timestamp);
  return date ? date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
};
