import type { PagedResponse } from "lcano-react-ui";

export function toPage<T>(items: T[], pageIndex: number, pageSize: number): PagedResponse<T> {
  const totalElements = items.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / pageSize));
  const number = Math.min(pageIndex, totalPages - 1);
  const start = number * pageSize;
  const content = items.slice(start, start + pageSize);
  return {
    content,
    totalElements,
    totalPages,
    size: pageSize,
    number,
    first: number === 0,
    last: number >= totalPages - 1,
    numberOfElements: content.length,
  };
}
