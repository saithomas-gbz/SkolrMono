type TopicEntity = {
  id: string;
  name: string;
  description: string;
  courseId: string;
  createdAt: string;
  updatedAt: string;
};

type TopicApiResponse = { data: TopicEntity; message: string };

export function useTopic() {
  const api = useApi();

  async function createTopic(body: { name: string; description: string; courseId: string }) {
    const response = await api<TopicApiResponse>('/grade/topics', {
      method: 'POST',
      body,
    });
    return response.data;
  }

  async function updateTopic(id: string, body: { name?: string; description?: string }) {
    const response = await api<TopicApiResponse>(`/grade/topics/${id}`, {
      method: 'PUT',
      body,
    });
    return response.data;
  }

  async function deleteTopic(id: string) {
    const response = await api<TopicApiResponse>(`/grade/topics/${id}`, {
      method: 'DELETE',
    });
    return response.data;
  }

  return { createTopic, updateTopic, deleteTopic };
}
