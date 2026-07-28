import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('axios', () => {
  const instance = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  }
  return {
    default: {
      create: vi.fn(() => instance),
    },
  }
})

// api.service.ts creates a module-level singleton with its own `activeRequests`
// counter, so each test gets a fresh module instance (and a fresh mock axios
// instance) to avoid loading-state bleeding across tests.
async function loadApiService() {
  vi.resetModules()
  const axiosModule = await import('axios')
  const { default: apiService } = await import('./api.service')

  const mockedAxios = vi.mocked(axiosModule.default, true)
  const instance = mockedAxios.create.mock.results[0]!.value
  const requestInterceptor = instance.interceptors.request.use.mock.calls[0][0]
  const [onFulfilled, onRejected] = instance.interceptors.response.use.mock.calls[0]

  return { apiService, instance, requestInterceptor, onFulfilled, onRejected }
}

describe('apiService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('request interceptor', () => {
    it('attaches a Bearer token from the registered token getter', async () => {
      const { apiService, requestInterceptor } = await loadApiService()
      apiService.registerTokenGetter(async () => 'token-123')

      const config = await requestInterceptor({ headers: {} })

      expect(config.headers.Authorization).toBe('Bearer token-123')
    })

    it('omits the Authorization header when the token getter returns null', async () => {
      const { apiService, requestInterceptor } = await loadApiService()
      apiService.registerTokenGetter(async () => null)

      const config = await requestInterceptor({ headers: {} })

      expect(config.headers.Authorization).toBeUndefined()
    })

    it('signals loading start on every outgoing request', async () => {
      const { apiService, requestInterceptor } = await loadApiService()
      const setLoading = vi.fn()
      apiService.registerLoadingSetter(setLoading)
      apiService.registerTokenGetter(async () => null)

      await requestInterceptor({ headers: {} })

      expect(setLoading).toHaveBeenCalledWith(true)
    })
  })

  describe('response interceptor', () => {
    it('signals loading stop once the single in-flight request settles', async () => {
      const { apiService, requestInterceptor, onFulfilled } = await loadApiService()
      const setLoading = vi.fn()
      apiService.registerLoadingSetter(setLoading)
      apiService.registerTokenGetter(async () => null)
      await requestInterceptor({ headers: {} })
      setLoading.mockClear()

      const response = { status: 200, data: {} }
      const result = onFulfilled(response)

      expect(result).toBe(response)
      expect(setLoading).toHaveBeenCalledWith(false)
    })

    it('only calls setLoading(false) once the last in-flight request settles', async () => {
      const { apiService, requestInterceptor, onFulfilled } = await loadApiService()
      const setLoading = vi.fn()
      apiService.registerLoadingSetter(setLoading)
      apiService.registerTokenGetter(async () => null)

      await requestInterceptor({ headers: {} })
      await requestInterceptor({ headers: {} })
      setLoading.mockClear()

      onFulfilled({ status: 200, data: {} })
      expect(setLoading).not.toHaveBeenCalledWith(false)

      onFulfilled({ status: 200, data: {} })
      expect(setLoading).toHaveBeenCalledWith(false)
    })

    it('invokes the unauthorized handler on a 401 error and still rejects', async () => {
      const { apiService, onRejected } = await loadApiService()
      const onUnauthorized = vi.fn()
      apiService.registerUnauthorizedHandler(onUnauthorized)

      const error = { response: { status: 401 } }
      await expect(onRejected(error)).rejects.toBe(error)

      expect(onUnauthorized).toHaveBeenCalledTimes(1)
    })

    it('does not invoke the unauthorized handler on a non-401 error', async () => {
      const { apiService, onRejected } = await loadApiService()
      const onUnauthorized = vi.fn()
      apiService.registerUnauthorizedHandler(onUnauthorized)

      const error = { response: { status: 500 } }
      await expect(onRejected(error)).rejects.toBe(error)

      expect(onUnauthorized).not.toHaveBeenCalled()
    })
  })

  describe('http methods', () => {
    it('get() returns the unwrapped response data', async () => {
      const { apiService, instance } = await loadApiService()
      instance.get.mockResolvedValue({ data: { status: true, data: 'ok' } })

      const result = await apiService.get('/collections')

      expect(instance.get).toHaveBeenCalledWith('/collections', undefined)
      expect(result).toEqual({ status: true, data: 'ok' })
    })

    it('post() forwards the body and returns the unwrapped response data', async () => {
      const { apiService, instance } = await loadApiService()
      instance.post.mockResolvedValue({ data: { status: true, data: 'created' } })

      const result = await apiService.post('/collections', { name: 'Reading list' })

      expect(instance.post).toHaveBeenCalledWith('/collections', { name: 'Reading list' }, undefined)
      expect(result).toEqual({ status: true, data: 'created' })
    })

    it('delete() calls through and returns the unwrapped response data', async () => {
      const { apiService, instance } = await loadApiService()
      instance.delete.mockResolvedValue({ data: undefined })

      const result = await apiService.delete('/collections/c1')

      expect(instance.delete).toHaveBeenCalledWith('/collections/c1', undefined)
      expect(result).toBeUndefined()
    })
  })
})
