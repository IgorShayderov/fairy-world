import { useState } from 'react';

const useLoadingState = () => {
  const [isLoading, setLoading] = useState(false);

  const callWithLoading = async (request: () => Promise<unknown>) => {
    try {
      setLoading(true);
      return await request();
    } finally {
      setLoading(false);
    }
  };

  return {
    isLoading,
    callWithLoading,
  };
};

export default useLoadingState;
