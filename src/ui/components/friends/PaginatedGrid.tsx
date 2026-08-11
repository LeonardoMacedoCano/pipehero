import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { SearchPagination, Stack } from "lcano-react-ui";
import styled from "styled-components";
import { toPage } from "../../utils/paginate.js";

const GRID_GAP_PX = 10;
const DEFAULT_ROWS_PER_PAGE = 3;
const DEFAULT_MIN_ITEM_WIDTH = "240px";

function useColumnCount(containerRef: RefObject<HTMLDivElement | null>, minItemWidthPx: number): number {
  const [columns, setColumns] = useState(1);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    function updateColumns() {
      const width = element!.clientWidth;
      const computed = Math.floor((width + GRID_GAP_PX) / (minItemWidthPx + GRID_GAP_PX));
      setColumns(Math.max(1, computed));
    }

    updateColumns();
    const observer = new ResizeObserver(updateColumns);
    observer.observe(element);
    return () => observer.disconnect();
  }, [containerRef, minItemWidthPx]);

  return columns;
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
  const containerRef = useRef<HTMLDivElement>(null);
  const minItemWidthPx = parseInt(minItemWidth, 10) || 240;
  const columns = useColumnCount(containerRef, minItemWidthPx);
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
