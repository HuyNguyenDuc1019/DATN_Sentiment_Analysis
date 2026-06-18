import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import { motion } from 'framer-motion';
import { HiPencil, HiChevronUp, HiChevronDown, HiMagnifyingGlass, HiChevronLeft, HiChevronRight } from 'react-icons/hi2';
import Badge from '@/components/ui/Badge';
import { SkeletonRow } from '@/components/ui/SkeletonCard';
import EmptyState from '@/components/ui/EmptyState';

const columnHelper = createColumnHelper();

const ResultsTable = ({ data = [], loading, onEdit }) => {
  const [sorting, setSorting] = useState([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'index',
        header: '#',
        cell: (info) => (
          <span className="font-mono text-xs text-slate-400">{info.row.index + 1}</span>
        ),
      }),
      columnHelper.accessor('text', {
        header: 'Bình luận',
        cell: (info) => (
          <span className="line-clamp-3 min-w-[260px] text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor('prediction', {
        header: 'Nhãn AI',
        cell: (info) => <Badge prediction={info.getValue()} />,
      }),
      columnHelper.accessor('confidence', {
        header: 'Confidence',
        cell: (info) => {
          const val = Number(info.getValue()) || 0;
          const normalized = val > 1 ? val / 100 : val;
          const pct = (normalized * 100).toFixed(1);

          return (
            <div className="flex min-w-[118px] items-center gap-2">
              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                <div
                  className={`h-full rounded-full ${normalized >= 0.8 ? 'bg-green-500' : normalized >= 0.6 ? 'bg-amber-400' : 'bg-red-400'}`}
                  style={{ width: `${Math.min(Number(pct), 100)}%` }}
                />
              </div>
              <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{pct}%</span>
            </div>
          );
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Hành động',
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => onEdit(row.original)}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-primary-100 px-3 py-1.5 text-xs font-medium text-primary-600 transition-colors hover:bg-primary-50 dark:border-primary-800/50 dark:text-primary-400 dark:hover:bg-primary-900/20"
          >
            <HiPencil className="h-3.5 w-3.5" />
            Sửa nhãn
          </button>
        ),
      }),
    ],
    [onEdit]
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.25 }}
      className="overflow-hidden rounded-xl border border-border bg-white shadow-card dark:border-slate-700 dark:bg-slate-800"
    >
      <div className="flex flex-col gap-3 border-b border-border px-4 py-4 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h3 className="font-display font-bold text-ink dark:text-white">Kết quả phân tích</h3>
          <p className="text-sm text-slate-400">{data.length.toLocaleString('vi-VN')} bình luận</p>
        </div>
        <div className="relative w-full sm:w-64">
          <HiMagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Tìm kiếm..."
            className="w-full rounded-xl border border-border bg-slate-50 py-2 pl-9 pr-4 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-500/30 dark:border-slate-600 dark:bg-slate-900/50 dark:text-white placeholder-slate-400"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px]">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="bg-slate-50 dark:bg-slate-900/40">
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className={`whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 ${header.column.getCanSort() ? 'cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-200' : ''}`}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === 'asc' && <HiChevronUp className="h-3.5 w-3.5" />}
                      {header.column.getIsSorted() === 'desc' && <HiChevronDown className="h-3.5 w-3.5" />}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-border dark:divide-slate-700">
            {loading ? (
              [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <EmptyState />
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 align-top">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && data.length > 0 && (
        <div className="flex flex-col gap-3 border-t border-border px-4 py-4 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-sm text-slate-400">
            Trang <span className="font-medium text-slate-600 dark:text-slate-300">{table.getState().pagination.pageIndex + 1}</span> / {table.getPageCount()}
            {' - '}<span className="font-medium text-slate-600 dark:text-slate-300">{table.getFilteredRowModel().rows.length}</span> kết quả
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:hover:bg-slate-700"
            >
              <HiChevronLeft className="h-4 w-4 text-slate-600 dark:text-slate-300" />
            </button>
            {Array.from({ length: Math.min(table.getPageCount(), 5) }, (_, i) => (
              <button
                type="button"
                key={i}
                onClick={() => table.setPageIndex(i)}
                className={`h-8 w-8 rounded-lg text-sm font-medium transition-colors ${
                  table.getState().pagination.pageIndex === i
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'border border-border text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              type="button"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:hover:bg-slate-700"
            >
              <HiChevronRight className="h-4 w-4 text-slate-600 dark:text-slate-300" />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default ResultsTable;
