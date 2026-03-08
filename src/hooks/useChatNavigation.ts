import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOrCreateListingConversation } from '@/api/endpoints/chat';
import { useAuth } from '@/contexts/AuthContext';

interface OpenListingChatInput {
  listingId: string;
  sellerId: string;
}

export const useChatNavigation = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [isStartingChat, setIsStartingChat] = useState(false);

  const openListingChat = useCallback(
    async (input: OpenListingChatInput) => {
      const { listingId, sellerId } = input;

      if (!currentUser) {
        navigate('/login', {
          state: {
            from: `/messages?listing=${encodeURIComponent(listingId)}&seller=${encodeURIComponent(
              sellerId
            )}`,
          },
        });
        return;
      }

      if (currentUser.id === sellerId) {
        navigate('/messages');
        return;
      }

      setIsStartingChat(true);
      try {
        const conversation = await getOrCreateListingConversation({
          listingId,
          buyerId: currentUser.id,
          sellerId,
        });

        navigate(
          `/messages?chat=${encodeURIComponent(conversation.id)}&listingContext=${encodeURIComponent(listingId)}`
        );
      } catch {
        navigate(
          `/messages?listing=${encodeURIComponent(listingId)}&seller=${encodeURIComponent(sellerId)}`
        );
      } finally {
        setIsStartingChat(false);
      }
    },
    [currentUser, navigate]
  );

  return {
    openListingChat,
    isStartingChat,
  };
};
