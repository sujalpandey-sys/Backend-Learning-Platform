import { api } from './api';
import {
  TaskCreate,
  TaskUpdate,
  TaskResponse,
  TaskPaginationResponse,
  TaskQueryParams,
  HealthReadyResponse,
} from '../types';

export const taskService = {
  async listTasks(params?: TaskQueryParams): Promise<TaskPaginationResponse> {
    const res = await api.get<TaskPaginationResponse>('/api/v1/tasks', { params });
    return res.data;
  },

  async getTask(taskId: number): Promise<TaskResponse> {
    const res = await api.get<TaskResponse>(`/api/v1/tasks/${taskId}`);
    return res.data;
  },

  async createTask(data: TaskCreate): Promise<TaskResponse> {
    const res = await api.post<TaskResponse>('/api/v1/tasks', data);
    return res.data;
  },

  async updateTask(taskId: number, data: TaskUpdate): Promise<TaskResponse> {
    const res = await api.patch<TaskResponse>(`/api/v1/tasks/${taskId}`, data);
    return res.data;
  },

  async deleteTask(taskId: number): Promise<void> {
    await api.delete(`/api/v1/tasks/${taskId}`);
  },

  async checkHealthReady(): Promise<HealthReadyResponse> {
    const res = await api.get<HealthReadyResponse>('/health/ready');
    return res.data;
  },
};

