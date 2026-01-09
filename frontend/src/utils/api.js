import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_BASE = `${BACKEND_URL}/api`;

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      sessionStorage.removeItem("authToken");
      // Redirect to login if on admin page
    }
    return Promise.reject(error);
  }
);

// ============================================================================
// PUBLIC API FUNCTIONS
// ============================================================================

export const publicApi = {
  // Profile
  getProfile: async () => {
    const response = await api.get("/profile");
    return response.data;
  },

  // Skills
  getSkills: async () => {
    const response = await api.get("/skills");
    return response.data;
  },

  getProjectsPage: async () => {
    const response = await api.get("/projects/content");
    return response.data;
  },

  // Projects
  getProjects: async () => {
    const response = await api.get("/projects");
    return response.data;
  },

  // Education
  getEducation: async () => {
    const response = await api.get("/education");
    return response.data;
  },

  // Experience
  getExperience: async () => {
    const response = await api.get("/experience");
    return response.data;
  },

  // Learning Journey
  getLearningJourney: async () => {
    const response = await api.get("/learning-journey");
    return response.data;
  },

  getGrowthMindset: async () => {
    const response = await api.get("/growth-mindset");
    return response.data;
  },

  // Experiments
  getExperiments: async () => {
    const response = await api.get("/experiments");
    return response.data;
  },

  getContactSection: async () => {
    const response = await api.get("/contact-section");
    return response.data;
  },

  // Contact
  submitContactForm: async (formData) => {
    const response = await api.post("/contact", formData);
    return response.data;
  },

  getFooter: async () => {
    const response = await api.get("/footer");
    return response.data;
  },
};

// ============================================================================
// ADMIN API FUNCTIONS
// ============================================================================

export const adminApi = {
  // Authentication
  login: async (credentials) => {
    // 1. Make the API call
    const response = await api.post("/admin/login", credentials);
    // 2. Return the ENTIRE response object
    return response;
  },

  logout: () => {
    sessionStorage.removeItem("authToken");
  },

  logoutNotify: async () => {
    await api.post("/admin/logout-notify");
  },

  getNotifications: async () => {
    const response = await api.get("/admin/notifications");
    return response.data;
  },

  markOneNotificationAsRead: async (notificationId) => {
    const response = await api.put(
      `/admin/notifications/${notificationId}/read`
    );
    return response.data;
  },

  markNotificationsAsRead: async () => {
    const response = await api.post("/admin/notifications/mark-read");
    return response.data;
  },

  clearAllNotifications: async () => {
    const response = await api.delete("/admin/notifications");
    return response.data;
  },

  getAdminProfile: async () => {
    const response = await api.get("/admin/me");
    // We return the whole response object so the frontend can check the `success` flag
    return response.data;
  },

  createAdmin: async (adminData) => {
    const response = await api.post("/admin/users", adminData);
    return response.data;
  },

  getAdmins: async () => {
    const response = await api.get("/admin/users");
    return response.data;
  },

  deleteAdmin: async (username) => {
    const response = await api.delete(`/admin/users/${username}`);
    return response.data;
  },

  verifyToken: async () => {
    const response = await api.get("/admin/verify");
    return response.data;
  },

  searchContent: async (query) => {
    const response = await api.get(`/admin/search?q=${query}`);
    return response.data;
  },

  getDashboardSummary: async () => {
    const response = await api.get("/admin/dashboard-summary");
    return response.data;
  },

  uploadResume: async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await api.post("/admin/upload-resume", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  // Profile Management
  updateProfile: async (profileData) => {
    const response = await api.put("/admin/profile", profileData);
    return response.data;
  },

  // Skills Management
  updateSkills: async (category, skillsData) => {
    const response = await api.put(`/admin/skills/${category}`, skillsData);
    return response.data;
  },

  deleteSkillsCategory: async (category) => {
    const response = await api.delete(`/admin/skills/${category}`);
    return response.data;
  },

  updateProjectsPage: async (contentData) => {
    const response = await api.put("/admin/projects/content", contentData);
    return response.data;
  },

  // Projects Management
  createProject: async (projectData) => {
    const response = await api.post("/admin/projects", projectData);
    return response.data;
  },

  updateProject: async (projectId, projectData) => {
    const response = await api.put(`/admin/projects/${projectId}`, projectData);
    return response.data;
  },

  deleteProject: async (projectId) => {
    const response = await api.delete(`/admin/projects/${projectId}`);
    return response.data;
  },

  // Education Management
  createEducation: async (educationData) => {
    const response = await api.post("/admin/education", educationData);
    return response.data;
  },
  updateEducation: async (educationId, educationData) => {
    const response = await api.put(
      `/admin/education/${educationId}`,
      educationData
    );
    return response.data;
  },
  deleteEducation: async (educationId) => {
    const response = await api.delete(`/admin/education/${educationId}`);
    return response.data;
  },

 createExperience: async (experienceData) => {
    const response = await api.post("/admin/experience", experienceData);
    return response.data;
  },
  updateExperience: async (experienceId, experienceData) => {
    const response = await api.put(`/admin/experience/${experienceId}`, experienceData);
    return response.data;
  },
  deleteExperience: async (experienceId) => {
    const response = await api.delete(`/admin/experience/${experienceId}`);
    return response.data;
  },

  createLearningPhase: async (phaseData) => {
    const response = await api.post("/admin/learning-journey", phaseData);
    return response.data;
  },

  updateLearningPhase: async (phaseId, phaseData) => {
    const response = await api.put(
      `/admin/learning-journey/${phaseId}`,
      phaseData
    );
    return response.data;
  },

  deleteLearningPhase: async (phaseId) => {
    const response = await api.delete(`/admin/learning-journey/${phaseId}`);
    return response.data;
  },

  // Add to adminApi
  updateGrowthMindset: async (data) => {
    const response = await api.put("/admin/growth-mindset", data);
    return response.data;
  },

  updateExperimentsSection: async (data) => {
    const response = await api.put("/admin/experiments", data);
    return response.data;
  },

  updateContactSection: async (data) => {
    const response = await api.put("/admin/contact-section", data);
    return response.data;
  },

  // Messages Management
  getMessages: async () => {
    const response = await api.get("/admin/messages");
    return response.data;
  },

  markMessageRead: async (messageId) => {
    const response = await api.put(`/admin/messages/${messageId}/read`);
    return response.data;
  },

  deleteMessage: async (messageId) => {
    const response = await api.delete(`/admin/messages/${messageId}`);
    return response.data;
  },

  updateFooter: async (data) => {
    const response = await api.put("/admin/footer", data);
    return response.data;
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export const isAuthenticated = () => {
  return !!sessionStorage.getItem("authToken");
};

export const handleApiError = (error, toast) => {
  console.error("API Error:", error);

  let message = "An unexpected error occurred. Please try again.";

  if (error.response) {
    const detail = error.response.data?.detail;
    if (typeof detail === "string") {
      message = detail;
    } else if (Array.isArray(detail) && detail[0]?.msg) {
      // Handle Pydantic validation errors
      message = `Validation Error: ${detail[0].msg} for field '${detail[0].loc[1]}'`;
    } else {
      message =
        error.response.data?.message ||
        `Server error: ${error.response.status}`;
    }
  } else if (error.request) {
    message = "Network error - please check your connection";
  } else {
    message = error.message || "Request failed";
  }

  if (toast) {
    toast({
      title: "Error",
      description: message, // This will now always be a string
      variant: "destructive",
    });
  }

  return message;
};

export default api;
