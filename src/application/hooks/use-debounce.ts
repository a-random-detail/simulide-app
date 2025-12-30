import {useCallback, useEffect, useRef} from "react";

// @ts-ignore
export function useDebounceCallback<T extends (...args: any[]) => any> (callback: T, delay: number = 500) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef<T>(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    return () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
    }
  }, []);

  const schedule = useCallback((...args: Parameters<T>) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      callbackRef.current(...args);
      timerRef.current = null;
    }, delay);
  }, [delay]);

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return { schedule, flush, cancel};
};

export default useDebounceCallback;



