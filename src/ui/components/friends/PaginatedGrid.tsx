import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { SearchPagination, Stack } from "lcano-react-ui";
import styled from "styled-components";
import { toPage } from "../../utils/paginate.js";

const GRID_GAP_PX = 10;
const DEFAULT_ROWS_PER_PAGE = 3;
const DEFAULT_MIN_ITEM_WIDTH = "240px";

function useColumnCount(minItemWidthPx: number): [(element: HTMLDivElement | null) => void, number] {
  const [columns, setColumns] = useState(1);
  const observerRef = useRef<ResizeObserver | null>(null);

  const setContainer = useCallback(
    (element: HTMLDivElement | null) => {
      observerRef.current?.disconnect();
      observerRef.current = null;
      if (!element) return;

      function updateColumns() {
        const width = element!.clientWidth;
        const computed = Math.floor((width + GRID_GAP_PX) / (minItemWidthPx + GRID_GAP_PX));
        setColumns(Math.max(1, computed));
      }

      updateColumns();
      const observer = new ResizeObserver(updateColumns);
      observer.observe(element);
      observerRef.current = observer;
    },
    [minItemWidthPx]
  );

  useEffect(() => () => observerRef.current?.disconnect(), []);

  return [setContainer, columns];
}

export default function PaginatedGrid<T>({
  items,
  keyExtractor,
  renderItem,
  emptyMessage,
  rowsPerPage = DEFAULT_ROWS_PER_PAGE,
  minItemWidth = DEFAULT_MIN_ITEM_WIDTH,
}: {
  items: T[];
  keyExtractor: (item: T) => string | number;
  renderItem: (item: T) => ReactNode;
  emptyMessage: string;
  rowsPerPage?: number;
  minItemWidth?: string;
}) {
  const minItemWidthPx = parseInt(minItemWidth, 10) || 240;
  const [containerRef, columns] = useColumnCount(minItemWidthPx);
  const pageSize = columns * rowsPerPage;
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => {
    setPageIndex(0);
  }, [items, pageSize]);

  if (items.length === 0) return <Muted>{emptyMessage}</Muted>;

  const page = toPage(items, pageIndex, pageSize);

  return (
    <Stack direction="column" gap="10px">
      <Grid ref={containerRef} $minItemWidth={minItemWidth}>
        {page.content.map((item) => (
          <div key={keyExtractor(item)}>{renderItem(item)}</div>
        ))}
      </Grid>
      {page.totalPages > 1 && <SearchPagination page={page} loadPage={(nextPageIndex) => setPageIndex(nextPageIndex)} />}
    </Stack>
  );
}

const Grid = styled.div<{ $minItemWidth: string }>`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(${({ $minItemWidth }) => $minItemWidth}, 1fr));
  gap: ${GRID_GAP_PX}px;
`;

const Muted = styled.div`
  opacity: 0.6;
  padding: 8px 0;
`;
