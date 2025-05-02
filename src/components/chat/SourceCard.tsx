
import React from "react";
import { FileText, ExternalLink } from "lucide-react";

type SourceCardProps = {
  source: {
    id: string;
    title: string;
    domain: string;
    snippet: string;
  };
  onClick: (sourceId: string) => void;
};

const SourceCard: React.FC<SourceCardProps> = ({ source, onClick }) => {
  return (
    <section 
      className="source-card cursor-pointer flex flex-col w-full min-w-[180px] sm:min-w-[250px] max-w-full sm:max-w-xs"
      onClick={() => onClick(source.id)}
    >
      <section className="flex items-start mb-2">
        <section className="w-8 h-8 rounded bg-gray-200 dark:bg-gray-700 mr-3 flex items-center justify-center flex-shrink-0">
          <FileText size={16} className="text-gray-500 dark:text-gray-400" />
        </section>
        <section className="flex-1 min-w-0">
          <h3 className="font-medium text-sm truncate">{source.title}</h3>
          <section className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span className="truncate">{source.domain}</span>
            <ExternalLink size={12} className="ml-1 flex-shrink-0" />
          </section>
        </section>
      </section>
      <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{source.snippet}</p>
    </section>
  );
};

export default SourceCard;
