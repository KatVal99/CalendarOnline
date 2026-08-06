import React, { useState } from 'react';

interface Column<T> {
  header: string;
  render: (row: T) => React.ReactNode;
}

interface Props<T> {
  data: T[];
  columns: Column<T>[];
  pageSize?: number;
  keyFn: (row: T, idx: number) => string | number;
}

export default function PaginatedTable<T>({ data, columns, pageSize = 5, keyFn }: Props<T>) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const slice = data.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div className="paginated-table">
      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.header}>{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="empty-row">Nessun dato</td>
              </tr>
            ) : (
              slice.map((row, idx) => (
                <tr key={keyFn(row, idx)}>
                  {columns.map((col) => (
                    <td key={col.header}>{col.render(row)}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="btn btn-small"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            ◀
          </button>
          <span>
            {page + 1} / {totalPages}
          </span>
          <button
            className="btn btn-small"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            ▶
          </button>
        </div>
      )}
    </div>
  );
}

