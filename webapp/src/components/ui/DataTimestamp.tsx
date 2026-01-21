import { useEffect, useState } from "react";
import styles from "./DataTimestamp.module.css";
import type { DataMetadata } from "../../data/types/dataMetadata";
import { useModelDataActions } from "../../app/contexts/ModelDataContext";

interface DataTimestampProps {
  className?: string;
  note?: string;
}

function getDataBaseUrl(runId?: string | null): URL {
  const origin = window.location.origin + import.meta.env.BASE_URL;
  if (runId) {
    return new URL(`results/${runId}/`, origin);
  }
  return new URL("data/", origin);
}

export default function DataTimestamp({
  className,
  note = "Simulated data",
}: DataTimestampProps) {
  const { currentRunId } = useModelDataActions();
  const [dataMetadata, setDataMetadata] = useState<DataMetadata | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchMetadata = async () => {
      try {
        const dataBase = getDataBaseUrl(currentRunId);
        const url = new URL("dataMetadata.json", dataBase);
        url.searchParams.set("t", String(Date.now()));
        const response = await fetch(url.toString(), { cache: "no-store" });
        if (response.ok && isMounted) {
          const data = await response.json();
          setDataMetadata(data);
        } else if (!response.ok && currentRunId && isMounted) {
          // Fallback to legacy data/ path
          const fallbackBase = getDataBaseUrl(null);
          const fallbackUrl = new URL("dataMetadata.json", fallbackBase);
          fallbackUrl.searchParams.set("t", String(Date.now()));
          const fallbackResponse = await fetch(fallbackUrl.toString(), {
            cache: "no-store",
          });
          if (fallbackResponse.ok) {
            const data = await fallbackResponse.json();
            setDataMetadata(data);
          }
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("(NO $) [DataTimestamp] fetch failed:", error);
        }
      }
    };
    fetchMetadata();
    return () => {
      isMounted = false;
    };
  }, [currentRunId]);

  const timestamp = dataMetadata?.generatedAtShort || "Loading...";
  const inputFiles = Array.isArray(dataMetadata?.inputFiles)
    ? dataMetadata.inputFiles
    : [];

  return (
    <div className={`${styles.timestamp} ${className || ""}`}>
      <span className={styles.label}>Data:</span>
      <time dateTime={dataMetadata?.generatedAt} className={styles.time}>
        {timestamp}
      </time>
      <span className={styles.note}>{note}</span>
      <span className={styles.note}>
        Run: {dataMetadata?.pipelineRunId || "Unknown"}
      </span>
    </div>
  );
}
