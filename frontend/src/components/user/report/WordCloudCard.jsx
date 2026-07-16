import React, { useEffect, useMemo, useState } from 'react';
import cloud from 'd3-cloud';

import EmptyData from './EmptyData';
import LegendItem from './LegendItem';
import {
  scaleWord,
  wordColor,
} from '../../../utils/user/reportUtils';

export default function WordCloudCard({ words }) {
  const [layoutWords, setLayoutWords] = useState([]);

  const cloudWords = useMemo(() => {
    const normalized = words.map((word) => ({
      text: word.text,
      value: Number(word.value || 1),
      sentiment: word.sentiment || 'neutral',
    }));
    const max = Math.max(1, ...normalized.map((word) => word.value));
    const min = Math.min(...normalized.map((word) => word.value), max);

    return normalized.slice(0, 40).map((word) => ({
      ...word,
      size: scaleWord(word.value, min, max),
    }));
  }, [words]);

  useEffect(() => {
    if (!cloudWords.length) {
      setLayoutWords([]);
      return undefined;
    }

    const layout = cloud()
      .size([440, 300])
      .words(cloudWords)
      .padding(5)
      .rotate((_, index) => (index % 7 === 0 ? -10 : index % 5 === 0 ? 10 : 0))
      .font('Inter, Arial, sans-serif')
      .fontWeight(700)
      .fontSize((word) => word.size)
      .on('end', (items) => setLayoutWords(items));

    layout.start();
    return () => layout.stop();
  }, [cloudWords]);

  return (
    <div className="break-inside-avoid flex flex-col rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-md lg:col-span-1">
      <h3 className="mb-1 text-lg font-medium text-white">Bản đồ từ khóa</h3>
      <p className="mb-4 text-xs text-slate-500">Từ càng lớn nghĩa là khách nhắc càng nhiều.</p>

      <div className="flex min-h-[300px] flex-1 items-center justify-center overflow-hidden rounded-xl border border-slate-700/50 bg-slate-900/50 p-5">
        {layoutWords.length ? (
          <div className="relative h-[300px] w-full max-w-[440px]">
            {layoutWords.map((word) => (
              <span
                key={`${word.text}-${word.value}`}
                title={`${word.text}: ${word.value} lần`}
                className="absolute left-1/2 top-1/2 cursor-default whitespace-nowrap font-bold leading-none transition-transform hover:scale-110"
                style={{
                  color: wordColor(word.sentiment),
                  fontSize: `${word.size}px`,
                  transform: `translate(${word.x}px, ${word.y}px) translate(-50%, -50%) rotate(${word.rotate}deg)`,
                }}
              >
                {word.text}
              </span>
            ))}
          </div>
        ) : (
          <EmptyData text="Chưa đủ dữ liệu từ khóa." />
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-400">
        <LegendItem color="bg-emerald-500" label="Khách hài lòng" />
        <LegendItem color="bg-rose-500" label="Khách chưa hài lòng" />
        <LegendItem color="bg-slate-400" label="Trung tính" />
      </div>
    </div>
  );
}
