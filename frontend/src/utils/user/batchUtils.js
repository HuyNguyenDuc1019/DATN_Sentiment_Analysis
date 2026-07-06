import toast from 'react-hot-toast';

export function normalizeBatchResults(results = []) {
  return results.map((item, index) => ({
    id: `#${String(index + 1).padStart(4, '0')}`,
    content: item.text || item.content || '',
    sentiment:
      item.prediction === null || item.prediction === undefined
        ? null
        : item.prediction === 1
          ? 'positive'
          : 'negative',
    confidence:
      item.prediction === null || item.prediction === undefined
        ? null
        : Math.round((Number(item.confidence) > 1 ? item.confidence : item.confidence * 100) || 0),
  }));
}

export function getBatchStats(tableData = []) {
  const positiveCount = tableData.filter((row) => row.sentiment === 'positive').length;
  const negativeCount = tableData.filter((row) => row.sentiment === 'negative').length;
  const averageConfidence = tableData.length
    ? Math.round(tableData.reduce((sum, row) => sum + Number(row.confidence || 0), 0) / tableData.length)
    : 0;

  return {
    positiveCount,
    negativeCount,
    averageConfidence,
  };
}

export function downloadBatchResults(rows = []) {
  if (!rows.length) {
    toast('Chưa có dữ liệu để tải xuống.');
    return;
  }

  const headers = ['id', 'content', 'sentiment', 'confidence'];
  const csv = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((key) => `"${String(row[key] ?? '').replace(/"/g, '""')}"`)
        .join(',')
    ),
  ].join('\n');

  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = `ket-qua-phan-hoi-${new Date().toISOString().slice(0, 10)}.csv`;

  document.body.appendChild(link);
  link.click();

  link.remove();
  URL.revokeObjectURL(url);

  toast.success('Đã tải danh sách phản hồi đang hiển thị.');
}
