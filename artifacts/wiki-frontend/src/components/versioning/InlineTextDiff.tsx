import { computeWordDiff } from "@/lib/text-diff";

interface InlineTextDiffProps {
  oldText: string;
  newText: string;
}

export function InlineTextDiff({ oldText, newText }: InlineTextDiffProps) {
  const segments = computeWordDiff(oldText, newText);

  return (
    <span className="text-sm whitespace-pre-wrap break-words">
      {segments.map((seg, i) => {
        if (seg.type === "removed") {
          return (
            <span
              key={i}
              className="bg-red-200 dark:bg-red-900/50 text-red-800 dark:text-red-200 line-through px-0.5 rounded"
            >
              {seg.text}
            </span>
          );
        }
        if (seg.type === "added") {
          return (
            <span
              key={i}
              className="bg-green-200 dark:bg-green-900/50 text-green-800 dark:text-green-200 px-0.5 rounded"
            >
              {seg.text}
            </span>
          );
        }
        return <span key={i}>{seg.text}</span>;
      })}
    </span>
  );
}
