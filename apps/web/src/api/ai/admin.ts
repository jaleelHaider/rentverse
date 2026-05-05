import { apiJsonRequest } from '@/api/clients';

export const triggerReseed = async (): Promise<{ ok: boolean; message?: string }> => {
  const resp = await apiJsonRequest('/ai/admin/seed', {
    method: 'POST',
    auth: true,
  });
  return resp;
};
