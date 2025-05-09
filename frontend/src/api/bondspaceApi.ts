import { API_ENDPOINTS } from '@/config/api';
import { ChatRequest, ChatResponse, ModelListResponse } from '@/types/bondspace.types';
import api from '@/config/axios'; // Import the main authenticated api instance

// Add request interceptor for logging
api.interceptors.request.use(request => {
  console.log('Request:', {
    url: request.url,
    method: request.method,
    data: request.data,
    headers: request.headers
  });
  return request;
});

// Add response interceptor for logging
api.interceptors.response.use(
  response => {
    console.log('Response:', {
      status: response.status,
      data: response.data
    });
    return response;
  },
  error => {
    console.error('API Error:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        data: error.config?.data
      }
    });
    return Promise.reject(error);
  }
);

export const bondspaceApi = {
  // Test connection using the models endpoint
  testConnection: async (): Promise<boolean> => {
    try {
      const response = await api.get<ModelListResponse>(API_ENDPOINTS.BONDSPACE.MODELS);
      return response.status === 200;
    } catch (error) {
      console.error('BondSpace API connection test failed:', error);
      return false;
    }
  },

  getAvailableModels: async (): Promise<ModelListResponse> => {
    try {
      const response = await api.get<ModelListResponse>(API_ENDPOINTS.BONDSPACE.MODELS);
      return response.data;
    } catch (error) {
      console.error('Error fetching models:', error);
      throw error;
    }
  },

  sendChatMessage: async (request: ChatRequest): Promise<ChatResponse> => {
    try {
      // Validate request structure
      if (!request.messages || !Array.isArray(request.messages)) {
        throw new Error('Invalid request: messages array is required');
      }
      
      if (request.messages.length === 0) {
        throw new Error('Invalid request: messages array cannot be empty');
      }

      // Ensure the request matches the working Postman format
      const formattedRequest = {
        messages: request.messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        systemInstruction: request.systemInstruction
      };
      
      // Log the formatted request
      console.log('Sending formatted chat request:', formattedRequest);
      
      const response = await api.post<ChatResponse>(
        API_ENDPOINTS.BONDSPACE.CHAT,
        formattedRequest,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );
      
      // Log successful response
      console.log('Chat response:', response.data);
      
      return response.data;
    } catch (error: any) {
      // Enhanced error logging
      console.error('Error sending chat message:', {
        error: {
          message: error.message,
          code: error.code,
          name: error.name
        },
        request: {
          messages: request.messages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          systemInstruction: request.systemInstruction
        },
        response: error.response ? {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers
        } : 'No response received'
      });
      
      // Log the raw error response if available
      if (error.response?.data) {
        console.error('Raw error response:', JSON.stringify(error.response.data, null, 2));
      }
      
      // Throw a more informative error
      if (error.response?.status === 401) {
        throw new Error('Authentication required. Please sign in.');
      } else if (error.response?.status === 403) {
        throw new Error('You do not have permission to use the AI chat.');
      } else if (error.response?.status === 404) {
        throw new Error('AI chat service not found. Please try again later.');
      } else if (error.response?.status >= 500) {
        throw new Error('AI service is currently unavailable. Please try again later.');
      }
      
      throw error;
    }
  }
};