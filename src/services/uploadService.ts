import { authService } from './authServices';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5500/api/v1';

export const uploadService = {
  async uploadUltrasoundImage(file: File, patientId: string): Promise<string> {
    const isTokenValid = await authService.validateAndRefreshToken();
    if (!isTokenValid) {
      throw new Error('Authentication required');
    }

    const token = authService.getAccessToken();
    const sessionId = authService.getSessionId();

    const formData = new FormData();
    formData.append('image', file);
    formData.append('patientId', patientId);

    const response = await fetch(`${BASE_URL}/uploads/ultrasound`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
        ...(sessionId && { 'x-session-id': sessionId }),
      },
      body: formData,
    });

    let data: any = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      throw new Error(data?.message || 'Image upload failed');
    }

    const url = data?.data?.url;
    if (!url) {
      throw new Error('Upload succeeded but no URL was returned');
    }

    return url;
  },
};
