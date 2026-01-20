import { useEffect, useState } from "react";
import styles from "./DataTimestamp.module.css";
import type { DataMetadata } from "../../data/types/dataMetadata";

interface DataTimestampProps {
  className?: string;
  note?: string;
}

const dataBase = new URL(
  "data/",
  window.location.origin + import.meta.env.BASE_URL,
);

export default function DataTimestamp({
  className,
  note = "Simulated data",
}: DataTimestampProps) {
  const [dataMetadata, setDataMetadata] = useState<DataMetadata | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchMetadata = async () => {
      try {
        const url = new URL("dataMetadata.json", dataBase);
        url.searchParams.set("t", String(Date.now()));
        const response = await fetch(url.toString(), { cache: "no-store" });
        if (response.ok && isMounted) {
          const data = await response.json();
          setDataMetadata(data);
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
  }, []);

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
