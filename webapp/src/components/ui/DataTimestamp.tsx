import { dataMetadata } from '../../data/adapters/dataMetadata';
import styles from './DataTimestamp.module.css';

interface DataTimestampProps {
  className?: string;
  note?: string;
}

export default function DataTimestamp({ className, note = 'Simulated data' }: DataTimestampProps) {
  const timestamp = dataMetadata.generatedAtShort || 'Unknown';
  const inputFiles = Array.isArray(dataMetadata.inputFiles) ? dataMetadata.inputFiles : [];

  return (
    <div className={`${styles.timestamp} ${className || ''}`}>
      <span className={styles.label}>Data:</span>
      <time dateTime={dataMetadata.generatedAt} className={styles.time}>
        {timestamp}
      </time>
      <span className={styles.note}>{note}</span>
      <span className={styles.note}>Run: {dataMetadata.pipelineRunId || 'Unknown'}</span>
      {inputFiles.length > 0 ? (
        <span className={styles.note}>
          Inputs:{' '}
          {inputFiles
            .map((file) => {
              if (!file || typeof file !== 'object') {
                return null;
              }
              const path = 'path' in file ? String(file.path) : 'Unknown';
              const modifiedAt = 'modifiedAt' in file ? String(file.modifiedAt || 'Unknown') : 'Unknown';
              return `${path} (${modifiedAt})`;
            })
            .filter(Boolean)
            .join('; ')}
        </span>
      ) : null}
    </div>
  );
}
