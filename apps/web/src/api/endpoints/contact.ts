import { apiJsonRequest } from '@/api/clients';

export interface ContactMessageInput {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  sourcePage?: string;
}

export interface ContactMessageSubmitResponse {
  ok: boolean;
  messageId: string;
  createdAt: string;
}

export const submitContactMessage = (input: ContactMessageInput) => {
  return apiJsonRequest<ContactMessageSubmitResponse>('/contact', {
    method: 'POST',
    body: input,
    auth: false,
  });
};

