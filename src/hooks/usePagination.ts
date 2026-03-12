import { useState, useCallback, useMemo, useRef, useEffect } from 'react';

interface PaginationOptions {
  totalItems: number;
  initialItemsPerPage?: number;
  initialPage?: number;
  onPageChange?: (page: number) => void;
  onItemsPerPageChange?: (items: number, page: number) => void;
  debounceDelay?: number;
}

const debounce = (func: Function, delay: number) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

export const usePagination = ({
  totalItems = 0,
  initialItemsPerPage = 25,
  initialPage = 1,
  onPageChange,
  onItemsPerPageChange,
  debounceDelay = 300
}: PaginationOptions) => {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage);
  const [isLoading, setIsLoading] = useState(false);

  const onPageChangeRef = useRef(onPageChange);
  const onItemsPerPageChangeRef = useRef(onItemsPerPageChange);

  useEffect(() => { onPageChangeRef.current = onPageChange; }, [onPageChange]);
  useEffect(() => { onItemsPerPageChangeRef.current = onItemsPerPageChange; }, [onItemsPerPageChange]);

  const debouncedPageChange = useCallback(
    debounce((page: number) => {
      onPageChangeRef.current?.(page);
      setIsLoading(false);
    }, debounceDelay),
    [debounceDelay]
  );

  const debouncedItemsPerPageChange = useCallback(
    debounce((newItemsPerPage: number, newPage: number) => {
      onItemsPerPageChangeRef.current?.(newItemsPerPage, newPage);
      setIsLoading(false);
    }, debounceDelay),
    [debounceDelay]
  );

  const paginationData = useMemo(() => {
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
    const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
    const startIndex = (validCurrentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage - 1, totalItems - 1);

    return {
      currentPage: validCurrentPage,
      totalPages,
      itemsPerPage,
      totalItems,
      startIndex,
      endIndex,
      hasNextPage: validCurrentPage < totalPages,
      hasPreviousPage: validCurrentPage > 1,
      isFirstPage: validCurrentPage === 1,
      isLastPage: validCurrentPage === totalPages,
    };
  }, [currentPage, itemsPerPage, totalItems]);

  const handlePageChange = useCallback((page: number) => {
    const newPage = Math.min(Math.max(1, page), paginationData.totalPages);
    if (newPage !== currentPage) {
      setCurrentPage(newPage);
      setIsLoading(true);
      debouncedPageChange(newPage);
    }
  }, [currentPage, paginationData.totalPages, debouncedPageChange]);

  const handleItemsPerPageChange = useCallback((newItems: number) => {
    if (newItems !== itemsPerPage && newItems > 0) {
      const currentStartIndex = (currentPage - 1) * itemsPerPage;
      const newPage = Math.max(1, Math.ceil((currentStartIndex + 1) / newItems));
      setItemsPerPage(newItems);
      setCurrentPage(newPage);
      setIsLoading(true);
      debouncedItemsPerPageChange(newItems, newPage);
    }
  }, [currentPage, itemsPerPage, debouncedItemsPerPageChange]);

  const getPaginatedData = useCallback(<T>(data: T[] = []): T[] => {
    return data.slice(paginationData.startIndex, paginationData.endIndex + 1);
  }, [paginationData]);

  return {
    ...paginationData,
    isLoading,
    handlePageChange,
    handleItemsPerPageChange,
    getPaginatedData,
    setCurrentPage: handlePageChange,
    setItemsPerPage: handleItemsPerPageChange,
  };
};