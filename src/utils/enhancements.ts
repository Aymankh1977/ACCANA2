// Safe enhancements - don't affect main app functionality
export interface UserPreferences {
  accreditationType: string;
  universitySize: string;
  previousExperience: string;
}

export interface Analytics {
  documentsProcessed: number;
  chatMessages: number;
  successfulSubmissions: number;
}

export const defaultPreferences: UserPreferences = {
  accreditationType: '',
  universitySize: '',
  previousExperience: ''
};

export const defaultAnalytics: Analytics = {
  documentsProcessed: 0,
  chatMessages: 0,
  successfulSubmissions: 0
};
