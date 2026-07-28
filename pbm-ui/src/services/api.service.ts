import axios from "axios";
import type { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";

type TokenGetter = () => Promise<string | null>;

class ApiService {
    private axiosInstance: AxiosInstance;

    private setLoading: ((val: boolean) => void) | null = null;
    private activeRequests = 0;

    private getToken: TokenGetter | null = null;
    private onUnauthorized: (() => void) | null = null;

    public registerLoadingSetter(fn: (val: boolean) => void) {
        this.setLoading = fn;
    }

    public registerTokenGetter(fn: TokenGetter) {
        this.getToken = fn;
    }

    public registerUnauthorizedHandler(fn: () => void) {
        this.onUnauthorized = fn;
    }

    private startLoading() {
        this.activeRequests++;
        this.setLoading?.(true);
    }

    private stopLoading() {
        this.activeRequests = Math.max(0, this.activeRequests - 1);
        if (this.activeRequests === 0) this.setLoading?.(false);
    }

    constructor(baseURL: string) {
        this.axiosInstance = axios.create({
            baseURL,
            headers: {
                "Content-Type": "application/json",
            },
        });

        this.axiosInstance.interceptors.request.use(async (config) => {
            const token = await this.getToken?.();

            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }

            this.startLoading();
            return config;
        });

        this.axiosInstance.interceptors.response.use(
            (response) => {
                this.stopLoading();
                return response;
            },
            (error: AxiosError) => {
                this.stopLoading();

                if (error.response?.status === 401) {
                    this.onUnauthorized?.();
                }

                return Promise.reject(error);
            }
        );
    }

    public async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
        const response: AxiosResponse<T> = await this.axiosInstance.get(url, config);
        return response.data;
    }

    public async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
        const response: AxiosResponse<T> = await this.axiosInstance.post(url, data, config);
        return response.data;
    }

    public async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
        const response: AxiosResponse<T> = await this.axiosInstance.put(url, data, config);
        return response.data;
    }

    public async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
        const response: AxiosResponse<T> = await this.axiosInstance.patch(url, data, config);
        return response.data;
    }

    public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
        const response: AxiosResponse<T> = await this.axiosInstance.delete(url, config);
        return response.data;
    }
}

const apiService = new ApiService(import.meta.env.VITE_API_URL || "http://localhost:3000/");
export default apiService;
