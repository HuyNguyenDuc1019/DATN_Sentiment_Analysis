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

const ResultsTable = ({ data, loading, onEdit }) => {
  const [sorting, setSorting] = useState([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'index',
        header: '#',
        cell: (info) => (
          <span className="text-slate-400 text-xs font-mono">{info.row.index + 1}</span>
        ),
      }),
      columnHelper.accessor('text', {
        header: 'Bình luận',
        cell: (info) => (
          <span className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2 leading-relaxed">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor('prediction', {
        header: 'Nhãn',
        cell: (info) => <Badge prediction={info.getValue()} />,
      }),
      columnHelper.accessor('confidence', {
        header: 'Confidence',
        cell: (info) => {
          const val = info.getValue();
          const pct = (val * 100).toFixed(1);
          return (
            <div className="flex items-center gap-2">
              <div className="w-16 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                <div
                  className={`h-full rounded-full ${val >= 0.8 ? 'bg-green-500' : val >= 0.6 ? 'bg-amber-400' : 'bg-red-400'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">{pct}%</span>
            </div>
          );
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Thao tác',
        cell: ({ row }) => (
          <button
            onClick={() => onEdit(row.original)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 border border-primary-100 dark:border-primary-800/50 transition-colors"
          >
            <HiPencil className="w-3.5 h-3.5" />
            Sửa
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
      transition={{ duration: 0.4, delay: 0.4 }}
      className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-border dark:border-slate-700 overflow-hidden"
    >
      {/* Table toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-border dark:border-slate-700">
        <div>
          <h3 className="font-display font-bold text-ink dark:text-white">Kết quả phân tích</h3>
          <p className="text-slate-400 text-sm">{(data || []).length.toLocaleString()} bình luận</p>
        </div>
        <div className="relative">
          <HiMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Tìm kiếm..."
            className="pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-900/50 border border-border dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 dark:text-white placeholder-slate-400 w-56"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="bg-slate-50 dark:bg-slate-900/40">
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className={`px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap ${header.column.getCanSort() ? 'cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-200' : ''}`}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === 'asc' && <HiChevronUp className="w-3.5 h-3.5" />}
                      {header.column.getIsSorted() === 'desc' && <HiChevronDown className="w-3.5 h-3.5" />}
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
                <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
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

      {/* Pagination */}
      {!loading && (data || []).length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-t border-border dark:border-slate-700">
          <p className="text-sm text-slate-400">
            Trang <span className="font-medium text-slate-600 dark:text-slate-300">{table.getState().pagination.pageIndex + 1}</span> / {table.getPageCount()}
            {' · '}<span className="font-medium text-slate-600 dark:text-slate-300">{table.getFilteredRowModel().rows.length}</span> kết quả
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="w-8 h-8 rounded-lg border border-border dark:border-slate-600 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <HiChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            </button>
            {Array.from({ length: Math.min(table.getPageCount(), 5) }, (_, i) => {
              const pg = i;
              return (
                <button
                  key={pg}
                  onClick={() => table.setPageIndex(pg)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                    table.getState().pagination.pageIndex === pg
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'border border-border dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  {pg + 1}
                </button>
              );
            })}
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="w-8 h-8 rounded-lg border border-border dark:border-slate-600 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <HiChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default ResultsTable;