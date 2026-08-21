import { useEffect, useRef, useState, type ReactNode } from "react";
import { SearchPagination, paginateClientSide } from "lcano-react-ui";
import styled from "styled-components";

const GRID_GAP_PX = 12;
const ROWS_PER_PAGE = 2;

function useColumnCount(cardWidthPx: number) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(1);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    function updateColumns() {
      const width = element!.clientWidth;
      const computed = Math.floor((width + GRID_GAP_PX) / (cardWidthPx + GRID_GAP_PX));
      setColumns(Math.max(1, computed));
    }

    updateColumns();
    const observer = new ResizeObserver(updateColumns);
    observer.observe(element);
    return () => observer.disconnect();
  }, [cardWidthPx]);

  return [containerRef, columns] as const;
}

function chunkIntoRows<T>(items: T[], rowSize: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += rowSize) {
    rows.push(items.slice(i, i + rowSize));
  }
  return rows;
}

export default function ShopItemGrid<T>({
  items,
  keyExtractor,
  renderItem,
  emptyMessage,
  resetKey,
  cardWidthPx,
}: {
  items: T[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  emptyMessage: string;
  resetKey: string;
  cardWidthPx: number;
}) {
  const [containerRef, columns] = useColumnCount(cardWidthPx);
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => {
    setPageIndex(0);
  }, [resetKey]);

  const pageSize = columns * ROWS_PER_PAGE;
  const page = paginateClientSide(items, pageIndex, pageSize);
  const rows = chunkIntoRows(page.content, columns);

  return (
    <Wrapper>
      <Grid ref={containerRef}>
        {rows.map((row, rowIndex) => (
          <Row key={rowIndex}>
            {row.map((item) => (
              <CardSlot key={keyExtractor(item)} $width={cardWidthPx}>
                {renderItem(item)}
              </CardSlot>
            ))}
          </Row>
        ))}
        {items.length === 0 && <Empty>{emptyMessage}</Empty>}
      </Grid>
      {page.totalPages > 1 && <SearchPagination page={page} loadPage={(nextPageIndex) => setPageIndex(nextPageIndex)} />}
    </Wrapper>
  );
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const Grid = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${GRID_GAP_PX}px;
`;

const Row = styled.div`
  display: flex;
  justify-content: center;
  gap: ${GRID_GAP_PX}px;
`;

const CardSlot = styled.div<{ $width: number }>`
  width: ${({ $width }) => $width}px;
  flex-shrink: 0;
`;

const Empty = styled.div`
  opacity: 0.6;
  padding: 8px 0;
`;
